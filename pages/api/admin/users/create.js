import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Faltan variables de entorno para Supabase' });
    }
    // Usar admin API para crear usuario con email confirmado automáticamente
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {}
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    // Retornar el user_id que se usará en system_users
    return res.status(200).json({ userId: data.user?.id });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error creando usuario' });
  }
}
