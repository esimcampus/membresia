import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import supabaseAdmin from 'lib/supabaseAdmin';
import { uploadFileToAppsScript } from 'lib/googleAppsScript';

// Configurar Next.js para no parsear el body automáticamente
export const config = {
  api: {
    bodyParser: false,
  },
};

// Tipos de archivo permitidos
const ALLOWED_TYPES = [
  'application/pdf', // .pdf
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv', // .csv
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'image/jpeg', // .jpg, .jpeg
  'image/png', // .png
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.odt', '.xlsx', '.csv', '.ods', '.jpg', '.jpeg', '.png', '.pptx'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
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

    // Obtener member_id del usuario
    const { data: systemUser, error: userError } = await supabaseAdmin
      .from('system_users')
      .select('member_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !systemUser?.member_id) {
      return res.status(403).json({ error: 'Usuario no tiene perfil de miembro' });
    }

    // Parsear formulario con formidable
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const branchId = fields.branchId?.[0] || fields.branchId;
    const annexId = fields.annexId?.[0] || fields.annexId || null;
    const categoryId = fields.categoryId?.[0] || fields.categoryId;
    const description = fields.description?.[0] || fields.description || '';

    if (!branchId) {
      return res.status(400).json({ error: 'branch_id es requerido' });
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'category_id es requerido' });
    }

    // Validar tipo de archivo
    const ext = path.extname(file.originalFilename || file.newFilename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ 
        error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Tipo MIME de archivo no permitido' });
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 10MB' });
    }

    // Obtener nombre de branch y annex para carpetas
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('name')
      .eq('branch_id', branchId)
      .single();

    let annexName = null;
    if (annexId) {
      const { data: annex } = await supabaseAdmin
        .from('annexes')
        .select('name')
        .eq('annex_id', annexId)
        .single();
      annexName = annex?.name;
    }

    if (!branch) {
      return res.status(404).json({ error: 'Filial no encontrada' });
    }

    // Construir ruta de carpetas para Apps Script
    let folderPath = branch.name;
    if (annexId && annexName) {
      folderPath += '/' + annexName;
    }

    // Leer archivo del disco temporal
    const fileBuffer = fs.readFileSync(file.filepath);

    // Subir a Google Drive mediante Apps Script
    const uploadedFile = await uploadFileToAppsScript(
      fileBuffer,
      file.originalFilename || file.newFilename,
      file.mimetype,
      folderPath
    );

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    // Guardar metadata en Supabase
    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        file_name: uploadedFile.fileName,
        file_type: ext.replace('.', ''),
        file_url: uploadedFile.fileId, // ID de Google Drive
        description: description || null,
        branch_id: branchId,
        annex_id: annexId,
        category_id: categoryId,
        uploaded_by: systemUser.member_id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error guardando documento en DB:', dbError);
      return res.status(500).json({ error: 'Error guardando metadata del documento' });
    }

    return res.status(200).json({
      success: true,
      document: document,
      message: 'Documento subido exitosamente',
    });

  } catch (error) {
    console.error('Error en upload:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
