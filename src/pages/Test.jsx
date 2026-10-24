import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { SkipForward, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const QUESTION_TIME_LIMIT = 30; // секунд на вопрос

export default function Test() {
  const { lang } = useLanguage();
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [testComplete, setTestComplete] = useState(false);
  const [answers, setAnswers] = useState([]);

  const timerRef = useRef(null);

  const currentQuestion = questions[currentIndex];

  // Загрузка вопросов темы
  useEffect(() => {
    if (!topicId) {
      setError('Тема не указана');
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error: err } = await supabase
        .from('questions')
        .select('*')
        .eq('topic_id', topicId)
        .order('difficulty', { ascending: true });

      if (err) {
        console.error('Ошибка загрузки вопросов:', err.message);
        setError('Не удалось загрузить вопросы');
        setLoading(false);
        return;
      }

      if (!data?.length) {
        setError('Вопросов по этой теме пока нет');
        setLoading(false);
        return;
      }

      setQuestions(data);
      setLoading(false);
    }

    load();
  }, [topicId]);

  // Таймер
  useEffect(() => {
    if (isAnswered || testComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, isAnswered, testComplete, timeLeft]);

  // Сброс состояния вопроса при переходе к следующему
  useEffect(() => {
    setSelectedIndex(null);
    setIsAnswered(false);
    setShowExplanation(false);
    setTimeLeft(QUESTION_TIME_LIMIT);
  }, [currentIndex]);

  const handleTimeUp = useCallback(async () => {
    const q = currentQuestion;
    const attempt = {
      session_id: sessionId,
      question_id: q.id,
      chosen_index: null,
      is_correct: false,
    };

    await supabase.from('attempts').insert([attempt]);

    setAnswers((prev) => [...prev, { questionId: q.id, chosenIndex: null, isCorrect: false }]);
    setIsAnswered(true);
    setShowExplanation(true);
  }, [currentQuestion, sessionId]);

  const handleSelect = useCallback(
    async (index) => {
      if (isAnswered) return;

      const q = currentQuestion;
      const isCorrect = index === q.correct_index;

      setSelectedIndex(index);
      setIsAnswered(true);
      setShowExplanation(true);

      const attempt = {
        session_id: sessionId,
        question_id: q.id,
        chosen_index: index,
        is_correct: isCorrect,
      };

      await supabase.from('attempts').insert([attempt]);

      setAnswers((prev) => [...prev, { questionId: q.id, chosenIndex: index, isCorrect }]);
    },
    [currentQuestion, isAnswered, sessionId]
  );

  const handleNext = useCallback(() => {
    if (currentIndex === questions.length - 1) {
      setTestComplete(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, questions.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Clock className="w-12 h-12 text-gray-400" />
          <p className="text-gray-600">Загрузка вопросов…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Ошибка</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate(`/topics/${topicId}`)}
          className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
        >
          {lang === 'ky' ? 'Артқа' : 'Назад к темам'}
        </button>
      </div>
    );
  }

  if (testComplete) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const total = questions.length;
    const percent = Math.round((correctCount / total) * 100);

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {lang === 'ky' ? 'Тест аяктаandy' : 'Тест завершён'}
            </h2>
            <p className="text-gray-600 mb-8">
              {lang === 'ky'
                ? `Дұрыс жауаптар: ${correctCount} / ${total}`
                : `Правильных ответов: ${correctCount} из ${total}`}
            </p>

            <div className="mb-8">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{percent}%</p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  navigate(`/topics/${topicId}`);
                }}
                className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
              >
                {lang === 'ky' ? 'Темага кайтуу' : 'К темам'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
              >
                {lang === 'ky' ? 'Башкы бет' : 'На главную'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = currentQuestion;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timePercent = (timeLeft / QUESTION_TIME_LIMIT) * 100;
  const isTimeCritical = timeLeft <= 5;

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Прогресс и таймер */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">
              {currentIndex + 1} / {questions.length}
            </span>
            <span>{lang === 'ky' ? 'суроо' : 'вопрос'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            <span className={`font-mono font-medium ${isTimeCritical ? 'text-red-600' : 'text-gray-700'}`}>
              {timeLeft}с
            </span>
          </div>
        </div>

        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-blue-600 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Карточка вопроса */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            {lang === 'ky' && q.text_ky ? q.text_ky : q.text}
          </h2>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={isAnswered}
                className={`w-full text-left px-4 py-3.5 rounded-lg border transition-all ${
                  isAnswered
                    ? i === q.correct_index
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : i === selectedIndex
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                <span className="font-bold text-blue-600 mr-3">{['A', 'B', 'C', 'D'][i]}</span>
                {opt}
              </button>
            ))}
          </div>

          {isAnswered && showExplanation && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-start gap-3 mb-3">
                {answers[currentIndex]?.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-green-700">
                      {lang === 'ky' ? 'Дұрыс!' : 'Правильно!'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-red-700">
                      {lang === 'ky' ? 'Жалған!' : 'Неверно!'}
                    </span>
                  </>
                )}
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  {lang === 'ky' ? 'Төҥөтүү:' : 'Объяснение:'}
                </p>
                <p className="text-sm text-blue-700">
                  {lang === 'ky' && q.explanation_ky ? q.explanation_ky : q.explanation}
                </p>
              </div>
            </div>
          )}

          {!isAnswered && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 text-center">
              {lang === 'ky'
                ? 'Вariantни танданыз — тийм 30 секунд'
                : 'Выберите вариант — на вопрос 30 секунд'}
            </div>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {isAnswered ? (
            <>
              <button
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {currentIndex === questions.length - 1 ? (
                  <>
                    <SkipForward className="w-4 h-4" /> {lang === 'ky' ? 'Тууралуу' : 'Завершить'}
                  </>
                ) : (
                  <>
                    <SkipForward className="w-4 h-4" />
                    {lang === 'ky' ? 'Кейинки' : 'Далее'}
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              disabled
              className="px-8 py-3 bg-gray-200 text-gray-400 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-gray-500">
                {lang === 'ky' ? 'Вariantни танданыз' : 'Выберите вариант'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
