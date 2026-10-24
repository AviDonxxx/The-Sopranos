/**
 * Валидация проекта «Математика с нуля»:
 *  - content/steps.json: 75 шагов, порядок 1..75 без пропусков, уникальные id, существующие файлы
 *  - content/lessons/*.md: существуют все файлы из steps.json
 *  - data/*.json: проверка вопросов (варианты = 4, correct_index, explanation, дубли)
 *
 * Экспортирует validate() и validateContent().
 * При запуске напрямую (npm run validate) печатает отчёт и завершается с кодом 1 при ошибках.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve('data');
const CONTENT_DIR = path.resolve('content');
const STEPS_FILE = path.join(CONTENT_DIR, 'steps.json');
const LESSONS_DIR = path.join(CONTENT_DIR, 'lessons');

export function validate(dataDir = DATA_DIR) {
  const errors = [];
  let subjects = 0;
  let topics = 0;
  let questions = 0;

  const files = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort()
    : [];

  const questionTexts = new Map();

  for (const file of files) {
    const fullPath = path.join(dataDir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (err) {
      errors.push(`${file}: невалидный JSON — ${err.message}`);
      continue;
    }

    const subj = data.subject;
    if (!subj || typeof subj !== 'object') {
      errors.push(`${file}: отсутствует объект subject`);
      continue;
    }
    if (!subj.id) errors.push(`${file}: subject.id не указан`);
    if (!subj.name) errors.push(`${file}: subject.name не указан`);
    if (!subj.name_ky) errors.push(`${file}: subject.name_ky не указан`);
    if (!subj.id || !subj.name || !subj.name_ky) continue;
    subjects += 1;

    if (!Array.isArray(data.topics)) {
      errors.push(`${file}: topics должен быть массивом`);
      continue;
    }

    for (const topic of data.topics) {
      if (!topic.id || !topic.name || !topic.name_ky || topic.order === undefined) {
        errors.push(`${file}: тема ${topic.id || '?'}: отсутствуют обязательные поля id/name/name_ky/order`);
        continue;
      }
      topics += 1;

      if (!Array.isArray(topic.questions)) {
        errors.push(`${file}: тема ${topic.id}: questions должен быть массивом`);
        continue;
      }

      for (let i = 0; i < topic.questions.length; i++) {
        const q = topic.questions[i];
        const ctx = `${file}: тема "${topic.name}" (${topic.id}), вопрос #${i}`;
        questions += 1;

        if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
          errors.push(`${ctx}: отсутствует текст вопроса`);
        }

        if (!Array.isArray(q.options)) {
          errors.push(`${ctx}: options должен быть массивом`);
        } else if (q.options.length !== 4) {
          errors.push(`${ctx}: ожидалось ровно 4 варианта, получено ${q.options.length}`);
        }

        if (typeof q.correct_index !== 'number' || !Number.isInteger(q.correct_index)) {
          errors.push(`${ctx}: correct_index должен быть целым числом`);
        } else if (q.options && (q.correct_index < 0 || q.correct_index >= q.options.length)) {
          errors.push(`${ctx}: correct_index ${q.correct_index} вне диапазона options (0..${q.options.length - 1})`);
        }

        if (!q.explanation || typeof q.explanation !== 'string' || !q.explanation.trim()) {
          errors.push(`${ctx}: отсутствует explanation`);
        }

        const textKey = (q.text || '').trim();
        if (textKey) {
          if (questionTexts.has(textKey)) {
            const prev = questionTexts.get(textKey);
            errors.push(
              `${ctx}: дубликат текста вопроса "${textKey}" (уже есть в "${prev.file}", тема "${prev.topic}", вопрос #${prev.index})`
            );
          } else {
            questionTexts.set(textKey, { file, topic: topic.id, index: i });
          }
        }
      }
    }
  }

  return { errors, subjects, topics, questions, files: files.length };
}

export function validateContent() {
  const errors = [];

  // 1. Проверка steps.json
  if (!fs.existsSync(STEPS_FILE)) {
    errors.push(`content/steps.json: файл не найден`);
    return { errors, steps: 0, lessons: 0 };
  }

  let steps;
  try {
    steps = JSON.parse(fs.readFileSync(STEPS_FILE, 'utf-8'));
  } catch (err) {
    errors.push(`content/steps.json: невалидный JSON — ${err.message}`);
    return { errors, steps: 0, lessons: 0 };
  }

  if (!Array.isArray(steps)) {
    errors.push(`content/steps.json: корневой элемент должен быть массивом`);
    return { errors, steps: 0, lessons: 0 };
  }

  if (steps.length !== 75) {
    errors.push(`content/steps.json: ожидается 75 шагов, получено ${steps.length}`);
  }

  const seenOrders = new Set();
  const seenIds = new Set();
  const seenFiles = new Set();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const ctx = `content/steps.json: шаг #${i + 1}`;

    if (!step.order || !Number.isInteger(step.order)) {
      errors.push(`${ctx}: поле order отсутствует или не целое число`);
    } else if (step.order !== i + 1) {
      errors.push(`${ctx}: order=${step.order}, ожидается ${i + 1} (порядок должен быть 1..75 без пропусков)`);
    } else if (seenOrders.has(step.order)) {
      errors.push(`${ctx}: дубликат order=${step.order}`);
    } else {
      seenOrders.add(step.order);
    }

    if (!step.id || typeof step.id !== 'string') {
      errors.push(`${ctx}: поле id отсутствует или не строка`);
    } else if (seenIds.has(step.id)) {
      errors.push(`${ctx}: дубликат id="${step.id}"`);
    } else {
      seenIds.add(step.id);
    }

    if (!step.title || typeof step.title !== 'string') {
      errors.push(`${ctx}: поле title отсутствует или не строка`);
    }

    if (!step.file || typeof step.file !== 'string') {
      errors.push(`${ctx}: поле file отсутствует или не строка`);
    } else {
      const expectedFile = `${String(step.order).padStart(2, '0')}-${step.id}.md`;
      if (step.file !== expectedFile) {
        errors.push(`${ctx}: file="${step.file}", ожидается "${expectedFile}" (формат: NN-id.md)`);
      }
      if (seenFiles.has(step.file)) {
        errors.push(`${ctx}: дубликат file="${step.file}"`);
      } else {
        seenFiles.add(step.file);
      }

      // Проверка существования файла урока
      const lessonPath = path.join(LESSONS_DIR, step.file);
      if (!fs.existsSync(lessonPath)) {
        errors.push(`${ctx}: файл урока не найден: ${lessonPath}`);
      }
    }
  }

  // 2. Проверка лишних файлов в lessons/
  if (fs.existsSync(LESSONS_DIR)) {
    const lessonFiles = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.md'));
    for (const file of lessonFiles) {
      if (!seenFiles.has(file)) {
        errors.push(`content/lessons/${file}: файл не описан в steps.json (лишний)`);
      }
    }
  }

  // 3. Проверка intro.md
  const introPath = path.join(CONTENT_DIR, 'intro.md');
  if (!fs.existsSync(introPath)) {
    errors.push(`content/intro.md: файл не найден`);
  }

  return { errors, steps: steps?.length ?? 0, lessons: seenFiles.size };
}

function isMainFile() {
  if (!process.argv[1]) return false;
  const normalize = (p) =>
    decodeURIComponent(p)
      .replace(/\\/g, '/')
      .replace(/^\/([a-zA-Z]):/, '$1:')
      .toLowerCase();
  const selfPath = new URL(import.meta.url).pathname;
  const mainPath = path.resolve(process.argv[1]);
  return normalize(mainPath) === normalize(selfPath);
}

if (isMainFile()) {
  console.log('=== Отчёт валидации проекта ===\n');

  // Валидация контента (steps + lessons)
  const contentResult = validateContent();
  console.log('--- Контент (content/) ---');
  console.log(`Шагов в steps.json: ${contentResult.steps}`);
  console.log(`Файлов уроков: ${contentResult.lessons}`);

  // Валидация данных (data/)
  const dataResult = validate();
  console.log('\n--- Данные (data/) ---');
  console.log(`Файлов: ${dataResult.files}`);
  console.log(`Предметов: ${dataResult.subjects}`);
  console.log(`Тем: ${dataResult.topics}`);
  console.log(`Вопросов: ${dataResult.questions}`);

  const allErrors = [...contentResult.errors, ...dataResult.errors];

  if (allErrors.length > 0) {
    console.log(`\n❌ Ошибок: ${allErrors.length}`);
    allErrors.forEach((e) => console.log(`  • ${e}`));
    process.exit(1);
  }

  console.log('\n✅ Все проверки пройдены.');
}