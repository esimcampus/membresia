import supabaseAdmin from 'lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { branchId } = req.query;

    let query = supabaseAdmin
      .from('members')
      .select(`
        member_id,
        first_name,
        last_name,
        national_id,
        phone,
        date_of_birth,
        avatar_url,
        annexes (
          annex_id,
          name,
          branch_id,
          branches (branch_id, name)
        ),
        system_users (role_id, user_id),
        countries:nationality_country_id (name),
        member_statuses (name)
      `)
      .order('last_name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error en query de miembros:', error);
      return res.status(500).json({ error: error.message });
    }

    // Filtrar por filial si se proporciona
    let filteredData = data || [];
    if (branchId) {
      filteredData = filteredData.filter(member => 
        member.annexes?.branches?.branch_id === branchId
      );
    }

    return res.status(200).json({ data: filteredData });
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
