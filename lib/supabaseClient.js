import { createClient } from '@supabase/supabase-js';

// Inicializa el cliente de Supabase usando variables de entorno públicas
// Soportamos ANON_KEY y PUBLISHABLE_KEY para mayor compatibilidad
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // En desarrollo, muestra una advertencia útil si faltan variables
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('Supabase: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
