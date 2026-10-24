import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { Play, List } from 'lucide-react';

export default function TopicSelect() {
  const { lang } = useLanguage();
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!subjectId) return;

      const [subjRes, topicRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('id', subjectId).single(),
        supabase.from('topics').select('*').eq('subject_id', subjectId).order('order', { ascending: true }),
      ]);

      if (subjRes.error) {
        console.error('Ошибка загрузки предмета:', subjRes.error.message);
      } else {
        setSubject(subjRes.data);
      }

      if (topicRes.error) {
        console.error('Ошибка загрузки тем:', topicRes.error.message);
      } else {
        setTopics(topicRes.data ?? []);
      }

      setLoading(false);
    }

    load();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Play className="w-12 h-12 text-gray-400" />
          <p className="text-gray-600">Загрузка тем…</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Предмет не найден</h2>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition mt-4"
        >
          Назад к предметам
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center gap-1"
          >
            <List className="w-4 h-4" /> {lang === 'ky' ? 'Артқа' : 'Назад'}
          </button>
          <span className="text-sm text-gray-400">/</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {lang === 'ky' && subject.name_ky ? subject.name_ky : subject.name}
          </h1>
          <p className="text-gray-600 mb-8">
            {lang === 'ky'
              ? 'Сынакачын танданган темаңизди тандоңуз'
              : 'Выберите тему для тренировки'}
          </p>
        </div>

        {!topics.length ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-6">
              {lang === 'ky' ? 'Темалар табылган жок' : 'Темы не найдены'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
            >
              {lang === 'ky' ? 'Артқа' : 'Назад к предметам'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => navigate(`/test/${topic.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded bg-green-100 text-green-600 flex items-center justify-center mb-4">
                  <Play className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition">
                  {lang === 'ky' && topic.name_ky ? topic.name_ky : topic.name}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
