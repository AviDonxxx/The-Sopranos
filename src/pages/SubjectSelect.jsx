import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import steps from '../../content/steps.json';
import introMd from '../../content/intro.md?raw';
import { useProgress } from '../context/ProgressContext';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export default function SubjectSelect() {
  const { lang } = useLanguage();
  const { completedSteps, isComplete, nextIncomplete } = useProgress();

  const totalSteps = steps.length;
  const readyStepsCount = 25;
  const completedCount = completedSteps?.length || 0;
  const nextStep = nextIncomplete() || 1;

  const introHtml = useMemo(() => {
    return DOMPurify.sanitize(marked.parse(introMd));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-10 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                {lang === 'ky' ? 'Базалык математика' : 'Базовый курс'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {lang === 'ky' ? 'Математика нөлдөн' : 'Математика с нуля'}
              </h1>
              <p className="text-white/90 text-base sm:text-lg max-w-xl">
                {lang === 'ky'
                  ? 'Сандардан баштап квадраттык теңдемелерге чейин — 75 кадамда түшүнүктүү жана жөнөкөй.'
                  : 'От простых чисел до квадратных уравнений — 75 последовательных шагов для лёгкого старта.'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 sm:min-w-[240px] flex flex-col justify-between">
              <div>
                <div className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">
                  {lang === 'ky' ? 'Сиздин прогрессиңиз' : 'Ваш прогресс'}
                </div>
                <div className="text-2xl font-bold mb-2">
                  {completedCount} <span className="text-sm font-normal text-white/80">/ {totalSteps}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                  <div
                    className="bg-green-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((completedCount / totalSteps) * 100)}%` }}
                  />
                </div>
              </div>
              <Link
                to={`/lesson/${nextStep}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition shadow-sm text-sm"
              >
                <span>
                  {completedCount === 0
                    ? (lang === 'ky' ? 'Окууну баштоо' : 'Начать обучение')
                    : (lang === 'ky' ? `${nextStep}-кадамды улантуу` : `Продолжить: шаг ${nextStep}`)}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Intro Section */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-100">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {lang === 'ky' ? 'Курс жөнүндө' : 'О курсе'}
            </h2>
          </div>
          <div
            className="prose prose-blue max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-blue-600 prose-table:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        </section>

        {/* Course Steps Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {lang === 'ky' ? 'Курстун кадамдары' : 'Программа курса'}
              </h2>
              <p className="text-sm text-gray-600">
                {lang === 'ky'
                  ? `Бардыгы ${totalSteps} кадам. 1–${readyStepsCount} жеткиликтүү, калгандары даярдалууда.`
                  : `Всего ${totalSteps} шагов. 1–${readyStepsCount} доступны для изучения, 26–${totalSteps} готовятся.`}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-800 self-start sm:self-auto shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{lang === 'ky' ? `Өтүлдү: ${completedCount} ичинен ${totalSteps}` : `Пройдено: ${completedCount} из ${totalSteps}`}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step) => {
              const isReady = step.order <= readyStepsCount;
              const completed = isComplete(step.order);

              return (
                <div
                  key={step.order}
                  className={`relative rounded-xl border p-5 transition flex flex-col justify-between ${
                    completed
                      ? 'bg-green-50/50 border-green-200 hover:border-green-300'
                      : isReady
                      ? 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm'
                      : 'bg-gray-50/70 border-gray-200 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {lang === 'ky' ? 'Кадам' : 'Шаг'} {step.order}
                      </span>
                      {completed ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          {lang === 'ky' ? 'Өтүлдү' : 'Пройден'}
                        </span>
                      ) : !isReady ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {lang === 'ky' ? 'Даярдалууда' : 'Урок готовится'}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-semibold text-gray-900 text-base leading-snug mb-3">
                      {step.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    {isReady ? (
                      <Link
                        to={`/lesson/${step.order}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
                      >
                        <span>{completed ? (lang === 'ky' ? 'Кайталоо' : 'Повторить') : (lang === 'ky' ? 'Ачуу' : 'Открыть')}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        to={`/lesson/${step.order}`}
                        className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                      >
                        <span>{lang === 'ky' ? 'Алдын ала көрүү' : 'Посмотреть заглушку'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
