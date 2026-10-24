import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ProgressProvider } from './context/ProgressContext';
import LanguageToggle from './components/LanguageToggle';
import SubjectSelect from './pages/SubjectSelect';
import LessonPage from './pages/LessonPage';

export default function App() {
  return (
    <LanguageProvider>
      <ProgressProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 text-gray-900">
            <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm group-hover:bg-blue-700 transition">
                      МН
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-blue-600 transition">
                      Математика с нуля
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <LanguageToggle />
                  </div>
                </div>
              </div>
            </header>

            <main>
              <Routes>
                <Route path="/" element={<SubjectSelect />} />
                <Route path="/lesson/:order" element={<LessonPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ProgressProvider>
    </LanguageProvider>
  );
}