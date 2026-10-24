import { supabase } from './supabase.js';

/**
 * Вызывает Edge Function ai-tasks для генерации 2 новых задач
 * по предмету/теме на основе ошибочного вопроса.
 *
 * @param {string} subject - предмет
 * @param {string} topic - тема
 * @param {string} wrongQuestion - текст вопроса, на котором ошибся пользователь
 * @returns {Promise<{questions: Array, source: string, topic: string}>}
 */
export async function getAiTasks(subject, topic, wrongQuestion) {
  const { data, error } = await supabase.functions.invoke('ai-tasks', {
    body: {
      subject,
      topic,
      wrongQuestion,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
