import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Ошибка Supabase: не заданы VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY. ' +
    'Создайте .env по примеру .env.example и укажите реальные значения.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
