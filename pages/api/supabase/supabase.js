import { supabase } from 'lib/supabaseClient';

export default async function handler(req, res) {
  // Intentamos ejecutar una consulta mínima a auth (no requiere RLS)
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, session: data?.session ? true : false });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
