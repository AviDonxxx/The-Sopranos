<<<<<<< HEAD
# Проект «Математика с нуля»

Статический сайт с пошаговыми уроками по математике для начинающих (75 шагов от чисел до квадратных уравнений).
Стек: Vite + React 18, Tailwind CSS, Markdown (`marked` + `DOMPurify`), клиентское сохранение прогресса в `localStorage`.

---

## Структура проекта

```text
content/
  intro.md             # Вводная статья о курсе
  steps.json           # Список всех 75 шагов ({ order, id, title, file })
  lessons/             # Markdown-файлы уроков (01-numbers.md, ...)
public/
  content/             # Автоматическая синхронизированная копия content/ (в .gitignore)
scripts/
  sync-content.js      # Скрипт синхронизации content/ -> public/content/
  validate.js          # Валидатор структуры шагов и контента
src/
  context/
    LanguageContext.jsx # Поддержка языков (ru / ky)
    ProgressContext.jsx # Логика прогресса (localStorage 'math-zero-progress')
  pages/
    SubjectSelect.jsx   # Главная страница (вступление + 75 шагов)
    LessonPage.jsx      # Страница урока (Markdown, раскрывающиеся ответы, навигация)
```

---

## Команды запуска

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера (с автоматической синхронизацией контента)
npm run dev

# Проверка контента и данных
npm run validate

# Синхронизация контента вручную (content/ -> public/content/)
npm run sync

# Production-сборка (prebuild автоматически синхронизирует контент)
npm run build

# Предпросмотр собранного проекта
npm run preview
```

---

## Единый источник контента (`sync-content`)

Единственным источником правды для уроков и вступления является каталог `content/`:
* `content/intro.md`
* `content/steps.json`
* `content/lessons/*.md`

При запуске `npm run dev` или `npm run build` (хук `prebuild`) автоматически выполняется `scripts/sync-content.js`, который полностью актуализирует каталог `public/content/`.
Директория `public/content/` добавлена в `.gitignore`, поэтому в репозиторий попадает только исходный контент.

---

## Как добавить новый урок

1. **Создайте файл урока:**
   Создайте файл в папке `content/lessons/` по схеме `NN-id.md`, например:
   `content/lessons/76-new-topic.md`
   Структура файла должна содержать:
   * Заголовок: `# Шаг 76. Название`
   * Теорию и примеры
   * Блок задач `## Проверь себя`
   * Разделитель `---` и блок `**Ответы:** ...` (он автоматически спрячется под спойлер «Показать ответы»).

2. **Зарегистрируйте шаг в `content/steps.json`:**
   Добавьте объект в массив `content/steps.json`:
   ```json
   {
     "order": 76,
     "id": "new-topic",
     "title": "Название темы",
     "file": "76-new-topic.md"
   }
   ```
   *Порядок `order` должен быть непрерывным, `id` — уникальным.*

3. **Проверьте корректность:**
   ```bash
   npm run validate
   ```

4. **Запустите проект:**
   ```bash
   npm run dev
   # или npm run build
   ```
   Контент будет автоматически скопирован в `public/content/`, и новый шаг отобразится на главной и в навигации.

---

## Деплой (Vercel)

Сайт является полностью статическим приложением на базе Vite:
* Переменные окружения не требуются.
* Конфигурация перенаправления маршрутов задана в [`vercel.json`](vercel.json), что обеспечивает корректную работу прямых ссылок вида `/lesson/5` и обновление страниц без ошибок 404.
* Сборка на Vercel запускается командой `npm run build` (хук `prebuild` автоматически готовит контент).

### Обновление контента на продакшене
1. Внесите правки в файлы уроков в папке `content/lessons/` или в `content/intro.md`.
2. Проверьте валидатором: `npm run validate`.
3. Зафиксируйте изменения в git и отправьте в репозиторий:
   ```bash
   git add content/
   git commit -m "docs: обновление материалов уроков"
   git push origin main
   ```
4. Vercel автоматически обнаружит пуш, выполнит сборку `npm run build` и обновит сайт за несколько секунд.
=======
# The-Sopranos
>>>>>>> refs/rewritten/Merge-remote-README-into-project
