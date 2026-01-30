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

    const { entityType, branchId, action, daysBack = 30, limit = 50, offset = 0 } = req.body || {};

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

      if (!allowedBranches.length) {
        return res.status(200).json({ data: [], count: 0 });
      }

      if (branchId && !allowedBranches.includes(branchId)) {
        return res.status(200).json({ data: [], count: 0 });
      }
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        members (first_name, last_name),
        branches (branch_id, name),
        annexes (annex_id, name)
      `, { count: 'exact' })
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (entityType) query = query.eq('entity_type', entityType);
    if (action) query = query.eq('action', action);
    if (branchId) query = query.eq('branch_id', branchId);

    if (allowedBranches) {
      query = query.in('branch_id', allowedBranches);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [], count: count || 0 });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}
