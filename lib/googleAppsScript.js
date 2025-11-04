// Utilidades para interactuar con Google Apps Script para gestión de archivos en Drive
// Esta solución evita la necesidad de Service Accounts y es 100% gratuita

/**
 * Subir archivo a Google Drive mediante Apps Script
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folderPath - Ruta de carpetas (ej: "Branch Argentina/Anexo Buenos Aires")
 * @returns {Promise<{fileId: string, fileName: string, fileSize: number}>}
 */
export async function uploadFileToAppsScript(fileBuffer, fileName, mimeType, folderPath = '') {
  try {
    // Convertir buffer a base64
    const base64Data = fileBuffer.toString('base64');

    // Preparar datos para enviar
    const formData = new URLSearchParams();
    formData.append('action', 'upload');
    formData.append('authorization', process.env.GOOGLE_APPS_SCRIPT_SECRET);
    formData.append('fileName', fileName);
    formData.append('mimeType', mimeType);
    formData.append('folderPath', folderPath);
    formData.append('fileData', base64Data);

    // Hacer petición al Apps Script
    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apps Script error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return {
      fileId: result.fileId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
    };
  } catch (error) {
    console.error('Error uploading file to Apps Script:', error);
    throw new Error('No se pudo subir el archivo a Google Drive');
  }
}

/**
 * Descargar archivo desde Google Drive mediante Apps Script
 * @param {string} fileId - ID del archivo en Google Drive
 * @returns {Promise<{fileName: string, mimeType: string, fileData: Buffer}>}
 */
export async function downloadFileFromAppsScript(fileId) {
  try {
    // Preparar datos para enviar
    const formData = new URLSearchParams();
    formData.append('action', 'download');
    formData.append('authorization', process.env.GOOGLE_APPS_SCRIPT_SECRET);
    formData.append('fileId', fileId);

    // Hacer petición al Apps Script
    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apps Script error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    // Convertir base64 a buffer
    const fileBuffer = Buffer.from(result.fileData, 'base64');

    return {
      fileName: result.fileName,
      mimeType: result.mimeType,
      fileSize: result.fileSize,
      fileData: fileBuffer,
    };
  } catch (error) {
    console.error('Error downloading file from Apps Script:', error);
    throw new Error('No se pudo descargar el archivo desde Google Drive');
  }
}

/**
 * Eliminar archivo de Google Drive mediante Apps Script
 * @param {string} fileId - ID del archivo en Google Drive
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteFileFromAppsScript(fileId) {
  try {
    // Preparar datos para enviar
    const formData = new URLSearchParams();
    formData.append('action', 'delete');
    formData.append('authorization', process.env.GOOGLE_APPS_SCRIPT_SECRET);
    formData.append('fileId', fileId);

    // Hacer petición al Apps Script
    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apps Script error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Delete failed');
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting file from Apps Script:', error);
    throw new Error('No se pudo eliminar el archivo de Google Drive');
  }
}
