import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, AlertTriangle, TrendingDown } from 'lucide-react';

const WEAK_THRESHOLD = 60; // %
const MIN_ANSWERS = 5;

export default function Statistics() {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- агрегация ---
  const bySubject = new Map(); // subjectId -> { name, name_ky, total, correct, topics: Map<topicId, {...}> }
  const weakTopics = []; // { subject, topic, total, correct, pct }

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('attempts')
        .select(
          `
          is_correct,
          questions (
            id,
            text,
            topics (
              id,
              name,
              name_ky,
              subjects (
                id,
                name,
                name_ky
              )
            )
          )
        `
        )
        .order('created_at', { ascending: false });

      if (err) {
        console.error('Ошибка загрузки статистики:', err.message);
        setError('Не удалось загрузить статистику');
        setLoading(false);
        return;
      }

      const attempts = data ?? [];

      bySubject.clear();
      weakTopics.length = 0;

      for (const a of attempts) {
        const q = a.questions;
        if (!q) continue;
        const topic = q.topics;
        if (!topic) continue;
        const subject = topic.subjects;
        if (!subject) continue;

        const subjId = subject.id;
        const topicId = topic.id;

        if (!bySubject.has(subjId)) {
          bySubject.set(subjId, {
            id: subjId,
            name: lang === 'ky' && subject.name_ky ? subject.name_ky : subject.name,
            total: 0,
            correct: 0,
            topics: new Map(),
          });
        }
        const s = bySubject.get(subjId);
        s.total += 1;
        if (a.is_correct) s.correct += 1;

        if (!s.topics.has(topicId)) {
          s.topics.set(topicId, {
            id: topicId,
            name: lang === 'ky' && topic.name_ky ? topic.name_ky : topic.name,
            total: 0,
            correct: 0,
            subjectName: s.name,
          });
        }
        const t = s.topics.get(topicId);
        t.total += 1;
        if (a.is_correct) t.correct += 1;
      }

      // слабые темы
      for (const s of bySubject.values()) {
        for (const t of s.topics.values()) {
          if (t.total >= MIN_ANSWERS) {
            const pct = Math.round((t.correct / t.total) * 100);
            if (pct < WEAK_THRESHOLD) {
              weakTopics.push({
                ...t,
                subjectName: s.name,
                pct,
              });
            }
          }
        }
      }
      weakTopics.sort((a, b) => a.pct - b.pct);

      setRows(Array.from(bySubject.values()));
      setLoading(false);
    }

    load();
  }, [lang]);

  const pct = (c, t) => (t === 0 ? 0 : Math.round((c / t) * 100));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <BarChart3 className="w-12 h-12 text-gray-400" />
          <p className="text-gray-600">Загрузка статистики…</p>
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
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
        >
          {lang === 'ky' ? 'Башкы бет' : 'На главную'}
        </button>
      </div>
    );
  }

  const totalAnswers = rows.reduce((sum, s) => sum + s.total, 0);
  const totalCorrect = rows.reduce((sum, s) => sum + s.correct, 0);
  const overallPct = pct(totalCorrect, totalAnswers);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {lang === 'ky' ? 'Статистика' : 'Статистика'}
            </h1>
            <p className="text-gray-600">
              {lang === 'ky'
                ? 'Тесттөн дұрыс жауаптар'
                : 'Процент правильных ответов по тестам'}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            {lang === 'ky' ? 'Башкы бет' : 'На главную'}
          </button>
        </div>

        {/* Общая статистика */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {lang === 'ky' ? 'Жалпы нәтижа' : 'Общий результат'}
              </h2>
              <div className="text-3xl font-bold text-gray-800">
                {overallPct}%
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {totalCorrect} / {totalAnswers}
                {lang === 'ky' ? ' дұрыс жауап' : ' правильных ответа'}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor:
                      overallPct >= 70 ? '#10b981' : overallPct >= 40 ? '#f59e0b' : '#ef4444',
                    width: `${overallPct}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* По предметам */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            {lang === 'ky' ? 'Предметтер бойунча' : 'По предметам'}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                      {lang === 'ky' ? 'Предмет' : 'Предмет'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                      {lang === 'ky' ? 'Жауаптар' : 'Ответов'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">
                      {lang === 'ky' ? 'Дұрыстар (%)' : 'Процент правильных'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                        {lang === 'ky' ? 'Статистика табылган жок' : 'Статистики пока нет'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((s) => {
                      const p = pct(s.correct, s.total);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {s.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.total}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${
                                p >= 60 ? 'text-green-700' : 'text-red-600'
                              }`}>{p}%</span>
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full"
                                  style={{
                                    backgroundColor:
                                      p >= 60 ? '#10b981' : '#ef4444',
                                    width: `${Math.min(p, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* По темам */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            {lang === 'ky' ? 'Темалар бойунча' : 'По темам'}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                      {lang === 'ky' ? 'Предмет / Тема' : 'Предмет / Тема'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                      {lang === 'ky' ? 'Жауаптар' : 'Ответов'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">
                      {lang === 'ky' ? 'Дұрыстар (%)' : 'Процент правильных'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                        {lang === 'ky' ? 'Статистика табылган жок' : 'Статистики пока нет'}
                      </td>
                    </tr>
                  ) : (
                    rows.flatMap((s) =>
                      Array.from(s.topics.values()).map((t) => {
                        const p = pct(t.correct, t.total);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3">
                              <div className="text-gray-800 font-medium">{t.name}</div>
                              <div className="text-xs text-gray-500">
                                {t.subjectName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{t.total}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${
                                  p >= 60 ? 'text-green-700' : 'text-red-600'
                                }`}>{p}%</span>
                                <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full"
                                    style={{
                                      backgroundColor:
                                        p >= 60 ? '#10b981' : '#ef4444',
                                      width: `${Math.min(p, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Слабые темы */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 text-red-700">
            <TrendingDown className="w-5 h-5" />
            {lang === 'ky' ? 'Оолгоо темалар' : 'Слабые темы'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {lang === 'ky'
              ? `60%-ден төбө жана 5-ден ашыр жауап бар темалар`
              : `Ниже 60% и минимум 5 ответов`}
          </p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-red-50 border-b border-red-100">
                    <th className="px-4 py-3 text-sm font-semibold text-red-700">
                      {lang === 'ky' ? 'Тема' : 'Тема'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-red-700">
                      {lang === 'ky' ? 'Предмет' : 'Предмет'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-red-700 text-right">
                      {lang === 'ky' ? 'Дұрыстар (%)' : 'Процент правильных'}
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-red-700 text-right">
                      {lang === 'ky' ? 'Жауаптар' : 'Ответов'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {weakTopics.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-green-600 font-medium">
                        {lang === 'ky'
                          ? 'Оолгоо темалари табылган жок!'
                          : 'Слабых тем не найдено! 🎉'}
                      </td>
                    </tr>
                  ) : (
                    weakTopics.map((t) => (
                      <tr key={t.id} className="hover:bg-red-25 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {t.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {t.subjectName}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-700">
                          {t.pct}%
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {t.total}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
