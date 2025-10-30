import supabaseAdmin from 'lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { branchId } = req.query;

    let query = supabaseAdmin
      .from('events')
      .select(`
        event_id,
        name,
        description,
        event_date,
        start_time,
        end_time,
        branch_id,
        annex_id,
        branches (name),
        annexes (name)
      `)
      .eq('is_active', true)
      .order('event_date')
      .order('start_time');

    // Filtrar por filial si se proporciona
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en query de eventos:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
