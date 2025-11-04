import supabaseAdmin from 'lib/supabaseAdmin';
import { deleteFileFromAppsScript } from 'lib/googleAppsScript';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { documentId } = req.query;

    if (!documentId) {
      return res.status(400).json({ error: 'documentId es requerido' });
    }

    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Obtener documento de la base de datos
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('document_id, file_name, file_url')
      .eq('document_id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // TODO: Agregar validación de permisos según rol del usuario
    // Por ahora permitimos eliminación a usuarios autenticados

    const fileId = document.file_url; // El ID de Drive está en file_url

    // Eliminar de Google Drive primero
    try {
      await deleteFileFromAppsScript(fileId);
    } catch (driveError) {
      console.error('Error eliminando de Drive:', driveError);
      // Continuar con eliminación de Supabase aunque falle Drive
    }

    // Eliminar de Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en delete:', error);
    return res.status(500).json({ 
      error: error.message || 'Error eliminando documento' 
    });
  }
}
