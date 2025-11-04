import supabaseAdmin from 'lib/supabaseAdmin';
import { downloadFileFromAppsScript } from 'lib/googleAppsScript';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
      .select('document_id, file_name, file_type, file_url, branch_id, annex_id')
      .eq('document_id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // TODO: Agregar validación de permisos según rol del usuario
    // Por ahora permitimos descarga a usuarios autenticados

    // Descargar archivo desde Google Drive mediante Apps Script
    const fileId = document.file_url; // El ID de Drive está en file_url

    const fileData = await downloadFileFromAppsScript(fileId);

    // Configurar headers para descarga
    res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.file_name)}"`);
    res.setHeader('Content-Length', fileData.fileSize);
    res.setHeader('Cache-Control', 'no-cache');

    // Enviar el buffer directamente
    res.send(fileData.fileData);

  } catch (error) {
    console.error('Error en download:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: error.message || 'Error descargando documento' 
      });
    }
  }
}
