import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con Service Role Key (solo para servidor)
// ⚠️ NUNCA importes este archivo en componentes del cliente
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabaseAdmin;
