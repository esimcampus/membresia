// Librería para interactuar con Google Drive API
import { google } from 'googleapis';

// Inicializar cliente de Google Drive
export const getDriveClient = () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_DRIVE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error inicializando Google Drive:', error);
    throw new Error('No se pudo conectar con Google Drive');
  }
};

// Buscar o crear carpeta por nombre
export const findOrCreateFolder = async (drive, folderName, parentFolderId = null) => {
  try {
    // Buscar carpeta existente
    const query = parentFolderId
      ? `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Crear carpeta si no existe
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId && { parents: [parentFolderId] }),
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error en findOrCreateFolder:', error);
    throw error;
  }
};

// Subir archivo a Drive
export const uploadFileToDrive = async (drive, fileBuffer, fileName, mimeType, folderId) => {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: require('stream').Readable.from(fileBuffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, size, mimeType',
    });

    return file.data;
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    throw error;
  }
};

// Descargar archivo desde Drive como stream
export const downloadFileFromDrive = async (drive, fileId) => {
  try {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (error) {
    console.error('Error descargando archivo:', error);
    throw error;
  }
};

// Obtener metadata del archivo
export const getFileMetadata = async (drive, fileId) => {
  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size',
    });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo metadata:', error);
    throw error;
  }
};

// Eliminar archivo de Drive (soft delete - mover a papelera)
export const deleteFileFromDrive = async (drive, fileId) => {
  try {
    await drive.files.update({
      fileId: fileId,
      requestBody: { trashed: true },
    });
    return true;
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    throw error;
  }
};
