import supabaseAdmin from 'lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { branchId } = req.query;

    let query = supabaseAdmin
      .from('documents')
      .select(`
        document_id,
        file_name,
        file_type,
        file_url,
        description,
        created_at,
        branch_id,
        annex_id,
        branches (branch_id, name),
        annexes (annex_id, name),
        members:uploaded_by (
          member_id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error en query de documentos:', error);
      return res.status(500).json({ error: error.message });
    }

    // Filtrar por filial si se proporciona
    let filteredData = data || [];
    if (branchId) {
      filteredData = filteredData.filter(doc => doc.branches?.branch_id === branchId);
    }

    return res.status(200).json({ data: filteredData });
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
