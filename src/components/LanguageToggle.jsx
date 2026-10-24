import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => setLang('ru')}
        className={`px-3 py-1 rounded border text-sm transition ${
          lang === 'ru'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLang('ky')}
        className={`px-3 py-1 rounded border text-sm transition ${
          lang === 'ky'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        KY
      </button>
    </div>
  );
}
