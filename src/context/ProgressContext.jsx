import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'math-zero-progress';
const TOTAL_STEPS = 75;

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [userId, setUserId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Сохранение в localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedSteps));
  }, [completedSteps]);

  // Синхронизация с Supabase (если авторизован)
  const syncToSupabase = useCallback(async () => {
    if (!userId || !supabase) return;
    setSyncing(true);
    try {
      await supabase.from('user_progress').upsert({
        user_id: userId,
        course_id: 'math-zero',
        completed_steps: completedSteps,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Progress sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [userId, completedSteps]);

  useEffect(() => {
    syncToSupabase();
  }, [syncToSupabase]);

  // Загрузка прогресса из Supabase
  const loadFromSupabase = useCallback(async (uid) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('user_progress')
        .select('completed_steps')
        .eq('user_id', uid)
        .eq('course_id', 'math-zero')
        .single();
      if (data?.completed_steps) {
        setCompletedSteps(data.completed_steps);
      }
    } catch (err) {
      console.error('Progress load error:', err);
    }
  }, []);

  const markComplete = useCallback((stepOrder) => {
    setCompletedSteps(prev => {
      if (prev.includes(stepOrder)) return prev;
      const next = [...prev, stepOrder].sort((a, b) => a - b);
      return next;
    });
  }, []);

  const unmarkComplete = useCallback((stepOrder) => {
    setCompletedSteps(prev => prev.filter(s => s !== stepOrder));
  }, []);

  const isComplete = useCallback((stepOrder) => completedSteps.includes(stepOrder), [completedSteps]);

  const progressPercent = Math.round((completedSteps.length / TOTAL_STEPS) * 100);

  const nextIncomplete = useCallback(() => {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (!completedSteps.includes(i)) return i;
    }
    return null;
  }, [completedSteps]);

  return (
    <ProgressContext.Provider value={{
      completedSteps,
      markComplete,
      unmarkComplete,
      isComplete,
      progressPercent,
      nextIncomplete,
      setUserId,
      loadFromSupabase,
      syncing
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}