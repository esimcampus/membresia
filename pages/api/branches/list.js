import supabaseAdmin from 'lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    let branchIds = [];

    // Si se proporciona userId, obtener las filiales del gestor
    if (userId) {
      const { data: managerData, error: managerError } = await supabaseAdmin
        .from('branch_managers')
        .select('branch_id')
        .eq('user_id', userId);

      if (managerError) {
        console.error('Error obteniendo filiales del gestor:', managerError);
      } else if (managerData && managerData.length > 0) {
        branchIds = managerData.map(bm => bm.branch_id);
      }
    }

    let query = supabaseAdmin
      .from('branches')
      .select('branch_id, name, countries (name)')
      .order('name');

    // Si hay filiales específicas, filtrar
    if (branchIds.length > 0) {
      query = query.in('branch_id', branchIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en query de filiales:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
