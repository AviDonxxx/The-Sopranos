import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 10_000;
const DEFAULT_MODEL = 'gemini-1.5-flash';

interface AiTasksRequest {
  subject?: string;
  topic?: string;
  wrongQuestion?: string;
}

interface GeneratedQuestion {
  text: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

/**
 * Извлекает JSON-массив из текста ответа Gemini (может быть в markdown-блоке)
 */
function extractJsonArray(text: string): GeneratedQuestion[] {
  let cleaned = text.trim();

  // Убираем markdown-блоки ```json ... ```
  const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  if (mdMatch?.[1]) {
    cleaned = mdMatch[1].trim();
  }

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Не найден JSON-массив в ответе Gemini');
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('Ответ Gemini не является массивом');
  }

  return parsed.map((q: unknown) => {
    const item = q as Record<string, unknown>;
    return {
      text: String(item['text'] ?? ''),
      options: Array.isArray(item['options']) ? item['options'] : [],
      correct_index: Number(item['correct_index']) ?? 0,
      explanation: String(item['explanation'] ?? ''),
    };
  });
}

function validateQuestions(qs: GeneratedQuestion[]): boolean {
  if (qs.length !== 2) return false;
  return qs.every(
    (q) =>
      q.text &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correct_index === 'number' &&
      q.correct_index >= 0 &&
      q.correct_index <= 3 &&
      q.explanation
  );
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

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const geminiModel = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({
        error:
          'Не задан секрет GEMINI_API_KEY. Задайте его через: supabase secrets set GEMINI_API_KEY=...',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let request: AiTasksRequest;
  try {
    request = (await req.json()) as AiTasksRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Неверный JSON в теле запроса' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const { subject, topic, wrongQuestion } = request;

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
  // Попытка 1: Gemini API (таймаут 10 секунд)
  // ------------------------------------------------------------------
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Актуальные имена моделей можно проверить в документации:
    // https://ai.google.dev/gemini-api/docs/models
    const systemPrompt = `Вы эксперт по составлению тестов ОРТ (Кыргызстан). Генерируйте ровно 2 новых вопроса с 4 вариантами ответа каждый. Отвечайте ТОЛЬКО валидным JSON-массивом без дополнительного текста. Каждый элемент: { text, options: [4 строки], correct_index: 0-3, explanation }. Язык вопросов — тот же, что и у исходного вопроса.`;

    const userPrompt = `Предмет: ${subject ?? 'не указан'}. Тема: ${topic}. Ученик ошибся на вопросе: "${wrongQuestion ?? ''}". Составьте 2 новых похожих вопроса по этой теме.`;

    const geminiRes = await fetch(
      `${GEMINI_API_URL_BASE}/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      throw new Error(`Gemini API вернул ${geminiRes.status}`);
    }

    const data = await geminiRes.json();
    const parts = data.candidates?.[0]?.content?.parts;
    const textContent = parts?.[0]?.text;

    if (!textContent) {
      throw new Error('Gemini вернул пустой ответ');
    }

    const generated = extractJsonArray(textContent);

    if (!validateQuestions(generated)) {
      throw new Error('Gemini вернул невалидные вопросы (не 2 задачи, не 4 варианта или неверный correct_index)');
    }

    return new Response(
      JSON.stringify({
        questions: generated,
        source: 'gemini',
        topic,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Gemini ошибка:', err.message);
    // Продолжаем к fallback
  }

  // ------------------------------------------------------------------
  // Попытка 2: Fallback — один вопрос из базы по теме (service role)
  // ------------------------------------------------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
      error:
        'Не удалось сгенерировать вопросы через Gemini и нет резервных в базе',
    }),
    {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
