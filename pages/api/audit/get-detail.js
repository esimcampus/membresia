import supabaseAdmin from 'lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { auditId } = req.body || {};
    if (!auditId) {
      return res.status(400).json({ error: 'auditId es requerido' });
    }

    const { data: systemUser, error: systemUserError } = await supabaseAdmin
      .from('system_users')
      .select('role_id')
      .eq('user_id', user.id)
      .single();

    if (systemUserError || !systemUser) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (systemUser.role_id > 2) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    let allowedBranches = null;
    if (systemUser.role_id === 2) {
      const { data: managerBranches } = await supabaseAdmin
        .from('branch_managers')
        .select('branch_id')
        .eq('user_id', user.id);

      allowedBranches = (managerBranches || []).map(bm => bm.branch_id);
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('audit_id', auditId);

    if (allowedBranches) {
      query = query.in('branch_id', allowedBranches);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}
