/**
 * Импорт вопросов из data/*.json в Supabase.
 * Порядок:
 *  1. Запускает validate.js — если есть ошибки, прерывается и не пишет в БД.
 *  2. Выводит отчёт: сколько предметов, тем, вопросов загружено + список ошибок.
 *  3. Заливает данные в Supabase (subjects → topics → questions).
 *
 * Запуск: npm run seed
 * Требования: .env с SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY,
 *             применённые миграции (supabase/migrations/001_initial_schema.sql)
 *             (загрузка .env через dotenv)
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { validate } from './validate.js';

const DATA_DIR = path.resolve('data');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Ошибка: укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env. ' +
    'Service role ключ используется только в scripts/ и функциях — никогда в фронтенде.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // --- Шаг 1: валидация ---
  const result = validate(DATA_DIR);

  console.log('=== Отчёт загрузки данных ===');
  console.log(`Файлов: ${result.files}`);
  console.log(`Предметов: ${result.subjects}`);
  console.log(`Тем: ${result.topics}`);
  console.log(`Вопросов: ${result.questions}`);

  if (result.errors.length > 0) {
    console.log(`\nОшибок: ${result.errors.length}. Импорт отменён.`);
    result.errors.forEach((e) => console.log(`  • ${e}`));
    process.exit(1);
  }

  console.log('\nВалидация пройдена. Начинаю импорт в Supabase…\n');

  // --- Шаг 2: загрузка в Supabase ---
  const files = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort()
    : [];

  let importedSubjects = 0;
  let importedTopics = 0;
  let importedQuestions = 0;
  const seedErrors = [];

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

    const subj = data.subject;

    // upsert subject
    const { error: subjErr } = await supabase.from('subjects').upsert({
      id: subj.id,
      name: subj.name,
      name_ky: subj.name_ky,
      order: 0,
    }, { onConflict: 'id' });

    if (subjErr) {
      seedErrors.push(`${file}: ошибка предмета ${subj.id} — ${subjErr.message}`);
      continue;
    }
    importedSubjects += 1;

    for (const topic of data.topics) {
      // upsert topic
      const { error: topicErr } = await supabase.from('topics').upsert({
        id: topic.id,
        subject_id: subj.id,
        name: topic.name,
        name_ky: topic.name_ky,
        order: topic.order ?? 0,
      }, { onConflict: 'id' });

      if (topicErr) {
        seedErrors.push(`${file}: ошибка темы ${topic.id} — ${topicErr.message}`);
        continue;
      }
      importedTopics += 1;

      for (const q of topic.questions) {
        const { error: qErr } = await supabase.from('questions').insert({
          topic_id: topic.id,
          text: q.text,
          text_ky: q.text_ky ?? null,
          options: q.options ?? [],
          correct_index: q.correct_index,
          explanation: q.explanation ?? null,
          explanation_ky: q.explanation_ky ?? null,
          difficulty: q.difficulty ?? 1,
        });

        if (qErr) {
          seedErrors.push(`${file}: ошибка вопроса в теме ${topic.id} — ${qErr.message}`);
          continue;
        }
        importedQuestions += 1;
      }

      console.log(`  ${file}: тема "${topic.name}" — ${topic.questions.length} вопросов`);
    }

    console.log(`✅ ${file}: предмет "${subj.name}" загружен`);
  }

  // --- Итоговый отчёт ---
  console.log('\n=== Итог импорта ===');
  console.log(`Предметов загружено: ${importedSubjects}`);
  console.log(`Тем загружено: ${importedTopics}`);
  console.log(`Вопросов загружено: ${importedQuestions}`);

  if (seedErrors.length > 0) {
    console.log(`\nОшибок при импорте: ${seedErrors.length}`);
    seedErrors.forEach((e) => console.log(`  • ${e}`));
    process.exit(1);
  }

  console.log('\n✅ Импорт завершён успешно.');
}

main().catch((err) => {
  console.error('Непредвиденная ошибка:', err);
  process.exit(1);
});
