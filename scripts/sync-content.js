/**
 * Скрипт синхронизации контента:
 * Копирует content/ в public/content/, удаляя старую копию при наличии.
 * Обеспечивает единый источник правды (content/) для статических файлов уроков.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve('content');
const DEST_DIR = path.resolve('public', 'content');

function syncContent() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[sync-content] Ошибка: исходная папка ${SRC_DIR} не найдена.`);
    process.exit(1);
  }

  // Удаляем старую копию, если есть
  if (fs.existsSync(DEST_DIR)) {
    fs.rmSync(DEST_DIR, { recursive: true, force: true });
  }

  // Копируем всю директорию content/ в public/content/
  fs.cpSync(SRC_DIR, DEST_DIR, { recursive: true });

  console.log(`[sync-content] Контент успешно синхронизирован: ${SRC_DIR} -> ${DEST_DIR}`);
}

syncContent();
