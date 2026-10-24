import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const TIMEOUT_MS = 10_000;

interface GenerateRequest {
  subject?: string;
  topic?: string;
  question_text?: string;
}

interface DeepSeekQuestion {
  text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty?: number;
}

/**
 * Извлекает JSON-массив из текста ответа DeepSeek (может быть в markdown-блоке)
 */
function extractJsonArray(text: string): DeepSeekQuestion[] {
  let cleaned = text.trim();

  // Убираем markdown-блоки ```json ... ```
  const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  if (mdMatch?.[1]) {
    cleaned = mdMatch[1].trim();
  }

  // Находим первый [ и последний ]
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Не найден JSON-массив в ответе DeepSeek');
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('Ответ DeepSeek не является массивом');
  }

  return parsed.map((q: unknown) => {
    const item = q as Record<string, unknown>;
    return {
      text: String(item['text'] ?? ''),
      options: Array.isArray(item['options']) ? item['options'] : [],
      correct_index: Number(item['correct_index']) ?? 0,
      explanation: String(item['explanation'] ?? ''),
      difficulty: Number(item['difficulty']) ?? 1,
    };
  });
}

function validateQuestions(qs: DeepSeekQuestion[]): DeepSeekQuestion[] {
  return qs.filter((q) => {
    if (!q.text || !q.options || q.options.length !== 4) return false;
    if (
      typeof q.correct_index !== 'number' ||
      q.correct_index < 0 ||
      q.correct_index >= q.options.length
    ) {
      return false;
    }
    return true;
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Метод не поддерживается. Используйте POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  let request: GenerateRequest;
  try {
    request = (await req.json()) as GenerateRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Неверный JSON в теле запроса' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const { subject, topic, question_text } = request;

  if (!topic) {
    return new Response(
      JSON.stringify({ error: 'Параметр "topic" обязателен' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // ------------------------------------------------------------------
  // Попытка 1: DeepSeek API (с таймаутом 10 секунд)
  // ------------------------------------------------------------------
  if (deepseekKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const systemPrompt = `Вы эксперт по составлению тестов ОРТ (Кыргызстан). Генерируйте ровно 2 новых вопросa с 4 вариантами ответа каждый. Отвечайте ТОЛЬКО валидным JSON-массивом без дополнительного текста. Каждый элемент: { text, options: [4 строки], correct_index: 0-3, explanation, difficulty: 1-3 }. Язык вопросов — тот же, что и у исходного вопроса.`;

      const userPrompt = `Предмет: ${subject ?? 'не указан'}. Тема: ${topic}. Ученик ошибся на вопросе: "${question_text ?? ''}". Составьте 2 новых похожих вопроса по этой теме.`;

      const deepseekRes = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deepseekKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!deepseekRes.ok) {
        throw new Error(`DeepSeek API вернул ${deepseekRes.status}`);
      }

      const data = await deepseekRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek вернул пустой ответ');
      }

      const generated = extractJsonArray(content);
      const valid = validateQuestions(generated);

      if (valid.length === 0) {
        throw new Error('DeepSeek не вернул валидных вопросов');
      }

      return new Response(
        JSON.stringify({
          questions: valid.slice(0, 2),
          source: 'deepseek',
          topic,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (err) {
      console.error('DeepSeek ошибка:', err.message);
      // Продолжаем к fallback
    }
  } else {
    console.error('DEEPSEEK_API_KEY не настроен в секретах Supabase');
  }

  // ------------------------------------------------------------------
  // Попытка 2: Fallback — один вопрос из базы по теме
  // ------------------------------------------------------------------
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: fallback, error: dbErr } = await supabase
        .from('questions')
        .select(
          `
          text,
          options,
          correct_index,
          explanation,
          difficulty,
          topics!inner(name)
        `
        )
        .eq('topics.name', topic)
        .limit(1);

      if (dbErr) {
        throw new Error(`Ошибка БД: ${dbErr.message}`);
      }

      if (!fallback || fallback.length === 0) {
        return new Response(
          JSON.stringify({
            questions: [],
            source: 'none',
            error: 'Нет вопросов в базе по этой теме',
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const questions = fallback.map((q: any) => ({
        text: q.text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
      }));

      return new Response(
        JSON.stringify({
          questions,
          source: 'fallback',
          topic,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (err) {
      console.error('Fallback ошибка:', err.message);
    }
  }

  // ------------------------------------------------------------------
  // Нет данных ниоткуда
  // ------------------------------------------------------------------
  return new Response(
    JSON.stringify({
      questions: [],
      source: 'none',
      error: 'Не удалось сгенерировать вопросы и нет резервных в базе',
    }),
    {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
