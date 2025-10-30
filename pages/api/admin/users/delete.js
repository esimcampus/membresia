import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Faltan variables de entorno para Supabase' });
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      // Si el usuario no existe en Auth, considerar como éxito idempotente
      const msg = (error.message || '').toLowerCase();
      if (!(msg.includes('not found') || msg.includes('no user'))) {
        return res.status(400).json({ error: error.message });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error eliminando usuario' });
  }
}
