import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import steps from '../../content/steps.json';
import { useProgress } from '../context/ProgressContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  Clock,
  Info
} from 'lucide-react';

const TOTAL_STEPS = steps.length;

export default function LessonPage() {
  const { lang } = useLanguage();
  const { order } = useParams();
  const navigate = useNavigate();
  const stepOrder = parseInt(order, 10);
  const { completedSteps, isComplete, markComplete, unmarkComplete, progressPercent } = useProgress();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStub, setIsStub] = useState(false);
  const [lessonData, setLessonData] = useState({ mainHtml: '', answersHtml: null });

  const currentStep = useMemo(() => steps.find(s => s.order === stepOrder), [stepOrder]);
  const prevStep = useMemo(() => steps.find(s => s.order === stepOrder - 1), [stepOrder]);
  const nextStep = useMemo(() => steps.find(s => s.order === stepOrder + 1), [stepOrder]);
  const completed = isComplete(stepOrder);

  // Прокрутка страницы к началу при переходе на новый шаг
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [stepOrder]);

  // Загрузка урока
  useEffect(() => {
    if (!currentStep) {
      setError('Урок не найден');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const isReadyStep = stepOrder <= 25;

    async function loadLesson() {
      try {
        const res = await fetch(`/content/lessons/${currentStep.file}`);
        if (!res.ok) {
          setIsStub(true);
          setLessonData({ mainHtml: '', answersHtml: null });
          return;
        }

        const text = await res.text();
        if (!text || text.trim().length === 0 || text.includes('добавлено позже') || !isReadyStep) {
          setIsStub(true);
          setLessonData({ mainHtml: '', answersHtml: null });
        } else {
          setIsStub(false);
          const parsed = processMarkdown(text);
          setLessonData(parsed);
        }
      } catch (err) {
        console.warn('Lesson load notice:', err);
        setIsStub(true);
        setLessonData({ mainHtml: '', answersHtml: null });
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [stepOrder, currentStep]);

  // Переключение отметки «Отметить как понятое»
  const handleToggleComplete = () => {
    if (completed) {
      unmarkComplete(stepOrder);
    } else {
      markComplete(stepOrder);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <BookOpen className="w-12 h-12 text-gray-400" />
          <p className="text-gray-600">{lang === 'ky' ? 'Сабак жүктөлүүдө…' : 'Загрузка урока…'}</p>
        </div>
      </div>
    );
  }

  if (error || !currentStep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-gray-600 mb-6">{error || 'Урок не найден'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ky' ? 'Башкы бетке' : 'На главную'}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Верхняя полоса прогресса */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between mb-1.5 text-xs sm:text-sm">
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'ky' ? 'Бардык кадамдар' : 'Все шаги'}</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">
                {lang === 'ky' ? 'Прогресс' : 'Прогресс'}: {completedSteps?.length || 0} / {TOTAL_STEPS}
              </span>
              <span className="text-gray-400">({progressPercent}%)</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Боковое оглавление на десктопе */}
          <aside className="lg:col-span-1 hidden lg:block">
            <Sidebar
              currentStep={stepOrder}
              completedSteps={completedSteps}
              onStepClick={(path) => navigate(path)}
            />
          </aside>

          {/* Основное содержимое урока */}
          <main className="lg:col-span-3 space-y-6">
            {/* Мягкая подсказка, если предыдущий шаг не пройден */}
            {prevStep && !isComplete(prevStep.order) && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">
                    {lang === 'ky'
                      ? 'Алгач мурунку кадамды өтүүнү сунуштайбыз: '
                      : 'Рекомендуем сначала пройти предыдущий шаг: '}
                    <Link
                      to={`/lesson/${prevStep.order}`}
                      className="font-semibold underline hover:text-amber-950"
                    >
                      {lang === 'ky' ? 'Кадам' : 'Шаг'} {prevStep.order}. {prevStep.title}
                    </Link>
                  </p>
                </div>
              </div>
            )}

            <article className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
              {/* Шапка урока */}
              <header className="mb-8 pb-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {lang === 'ky' ? 'Кадам' : 'Шаг'} {stepOrder} {lang === 'ky' ? 'ичинен' : 'из'} {TOTAL_STEPS}
                    </span>
                    {completed && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        {lang === 'ky' ? 'Түшүнүктүү' : 'Понято'}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {currentStep.title}
                  </h1>
                </div>

                {/* Кнопка отметки понимания в шапке */}
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition sm:self-start ${
                    completed
                      ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${completed ? 'text-green-600' : 'text-gray-400'}`} />
                  <span>
                    {completed
                      ? (lang === 'ky' ? 'Түшүнүктүү' : 'Понято')
                      : (lang === 'ky' ? 'Түшүндүм' : 'Отметить как понятое')}
                  </span>
                </button>
              </header>

              {/* Содержимое урока или заглушка */}
              {isStub ? (
                <div className="py-12 px-4 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 my-4">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {lang === 'ky' ? 'Сабак даярдалууда' : 'Урок готовится'}
                  </h2>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    {lang === 'ky'
                      ? 'Бул кадам жакында кошулат. Сиз башка кадамдарга өтүп окуй аласыз.'
                      : 'Материалы для этого шага находятся в разработке и скоро появятся. Вы можете перейти к следующему шагу или вернуться к пройденным.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Основной текст урока */}
                  <div
                    className="prose prose-blue max-w-none text-gray-800 prose-headings:text-gray-900 prose-a:text-blue-600"
                    dangerouslySetInnerHTML={{ __html: lessonData.mainHtml }}
                  />

                  {/* Раскрывающийся блок ответов */}
                  {lessonData.answersHtml && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <details className="group rounded-xl border border-blue-100 bg-blue-50/30 p-4 transition">
                        <summary className="cursor-pointer font-semibold text-blue-700 hover:text-blue-900 select-none py-1">
                          {lang === 'ky' ? 'Жоопторду көрсөтүү' : 'Показать ответы'}
                        </summary>
                        <div
                          className="mt-4 pt-3 border-t border-blue-100 prose prose-blue max-w-none text-gray-800"
                          dangerouslySetInnerHTML={{ __html: lessonData.answersHtml }}
                        />
                      </details>
                    </div>
                  )}
                </>
              )}

              {/* Блок отметки под уроком */}
              <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-sm text-gray-600 text-center sm:text-left">
                  {completed
                    ? (lang === 'ky' ? 'Бул кадам өздөштүрүлдү. Кайра басуу белгини алып салат.' : 'Этот шаг отмечен как освоенный. Повторное нажатие снимет отметку.')
                    : (lang === 'ky' ? 'Теманы түшүндүңүзбү? Белгилеп коюңуз.' : 'Разобрались в теме? Отметьте шаг как понятый.')}
                </span>
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition w-full sm:w-auto ${
                    completed
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${completed ? 'text-white' : 'text-gray-400'}`} />
                  <span>
                    {completed
                      ? (lang === 'ky' ? 'Түшүнүктүү деп белгиленди' : 'Отмечено как понятое')
                      : (lang === 'ky' ? 'Отметить как понятое' : 'Отметить как понятое')}
                  </span>
                </button>
              </div>

              {/* Навигация «Назад» и «Дальше» */}
              <nav className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                {prevStep ? (
                  <Link
                    to={`/lesson/${prevStep.order}`}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{lang === 'ky' ? 'Артка' : 'Назад'}</span>
                  </Link>
                ) : (
                  <div />
                )}

                {nextStep ? (
                  <Link
                    to={`/lesson/${nextStep.order}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm ml-auto"
                  >
                    <span>{lang === 'ky' ? 'Кийинки' : 'Дальше'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : null}
              </nav>
            </article>

            {/* Боковое оглавление на мобильных устройствах */}
            <div className="lg:hidden mt-6">
              <Sidebar
                currentStep={stepOrder}
                completedSteps={completedSteps}
                onStepClick={(path) => navigate(path)}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ currentStep, completedSteps, onStepClick }) {
  const { lang } = useLanguage();

  const blocks = [
    { name: lang === 'ky' ? 'Арифметика' : 'Арифметика', steps: steps.slice(0, 27) },
    { name: lang === 'ky' ? 'Алгебра (башталышы)' : 'Алгебра (начало)', steps: steps.slice(27, 41) },
    { name: lang === 'ky' ? 'Маселелер' : 'Задачи', steps: steps.slice(41, 47) },
    { name: lang === 'ky' ? 'Теңдемелер жана барабарсыздыктар' : 'Уравнения и неравенства', steps: steps.slice(47, 54) },
    { name: lang === 'ky' ? 'Алгебра (уландысы)' : 'Алгебра (продолжение)', steps: steps.slice(54, 63) },
    { name: lang === 'ky' ? 'Тамырлар жана квадраттык теңдемелер' : 'Корни и квадратные уравнения', steps: steps.slice(63, 75) },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-600" />
        {lang === 'ky' ? 'Мазмуну' : 'Оглавление'}
      </h3>
      <nav className="space-y-1">
        {blocks.map((block, bi) => (
          <details key={bi} className="group" defaultOpen={block.steps.some(s => s.order === currentStep)}>
            <summary className="font-medium text-xs text-gray-500 uppercase tracking-wider cursor-pointer px-2 py-1.5 rounded hover:bg-gray-50 select-none">
              {block.name}
            </summary>
            <ul className="mt-1 ml-2 space-y-0.5">
              {block.steps.map((s) => {
                const completed = completedSteps?.includes(s.order);
                const isCurrent = s.order === currentStep;
                return (
                  <li key={s.order}>
                    <button
                      type="button"
                      onClick={() => onStepClick(`/lesson/${s.order}`)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition flex items-center gap-2 ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : completed
                          ? 'text-green-700 hover:bg-green-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      ) : (
                        <span className="w-3.5 text-gray-400 text-right flex-shrink-0">{s.order}.</span>
                      )}
                      <span className="flex-1 truncate">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </nav>
    </div>
  );
}

function processMarkdown(raw) {
  const marker = '**Ответы:**';
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    return {
      mainHtml: DOMPurify.sanitize(marked.parse(raw)),
      answersHtml: null,
    };
  }
  const before = raw.slice(0, idx);
  const answers = raw.slice(idx);
  const sepMatch = before.match(/---[\s\r\n]*$/);
  const main = sepMatch ? before.slice(0, sepMatch.index).trimEnd() : before.trimEnd();

  return {
    mainHtml: DOMPurify.sanitize(marked.parse(main)),
    answersHtml: DOMPurify.sanitize(marked.parse(answers)),
  };
}
