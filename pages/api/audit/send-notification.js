import supabaseAdmin from 'lib/supabaseAdmin';
import nodemailer from 'nodemailer';

// Configurar transportador de email (usa variables de entorno)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Genera HTML del email de notificación
 */
const generateEmailHTML = (auditLog, userName, branchName) => {
  const actionLabels = {
    'CREATE': '✨ Creado',
    'UPDATE': '✏️ Modificado',
    'DELETE': '🗑️ Eliminado'
  };

  const actionColors = {
    'CREATE': '#10b981',
    'UPDATE': '#f59e0b',
    'DELETE': '#ef4444'
  };

  const action = auditLog.action;
  const actionLabel = actionLabels[action] || action;
  const actionColor = actionColors[action] || '#6b7280';

  let changesHTML = '';
  if (auditLog.old_values || auditLog.new_values) {
    changesHTML = `
      <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 14px;">Cambios realizados:</h3>
        ${auditLog.old_values ? `
          <div style="margin-bottom: 10px;">
            <strong style="color: #6b7280;">Valores anteriores:</strong>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(auditLog.old_values, null, 2)}
            </pre>
          </div>
        ` : ''}
        ${auditLog.new_values ? `
          <div>
            <strong style="color: #6b7280;">Valores nuevos:</strong>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(auditLog.new_values, null, 2)}
            </pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2d3748; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .action-badge { 
          display: inline-block; 
          padding: 8px 16px; 
          background: ${actionColor}; 
          color: white; 
          border-radius: 20px; 
          font-weight: bold;
          margin-bottom: 15px;
        }
        .detail-row { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #3182ce; }
        .detail-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .detail-value { color: #1f2937; font-weight: bold; margin-top: 5px; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">Registro de Cambios</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Notificación de cambios en el sistema</p>
        </div>
        <div class="content">
          <div class="action-badge">${actionLabel}</div>
          
          <div class="detail-row">
            <div class="detail-label">Tipo de Registro</div>
            <div class="detail-value">${formatEntityType(auditLog.entity_type)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Descripción</div>
            <div class="detail-value">${auditLog.description || 'Sin descripción'}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Usuario</div>
            <div class="detail-value">${userName}</div>
          </div>

          ${branchName ? `
            <div class="detail-row">
              <div class="detail-label">Filial</div>
              <div class="detail-value">${branchName}</div>
            </div>
          ` : ''}

          <div class="detail-row">
            <div class="detail-label">Fecha y Hora</div>
            <div class="detail-value">${new Date(auditLog.created_at).toLocaleString('es-ES')}</div>
          </div>

          ${auditLog.changes_count > 1 ? `
            <div class="detail-row">
              <div class="detail-label">Campos Modificados</div>
              <div class="detail-value">${auditLog.changes_count} cambios</div>
            </div>
          ` : ''}

          ${changesHTML}

          <div class="footer">
            <p>Este es un email automatizado del sistema de auditoría. Por favor no responder.</p>
            <p>Para más detalles, accede al panel de auditoría en el sistema.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

function formatEntityType(type) {
  const labels = {
    'miembros': 'Miembro',
    'documentos': 'Documento',
    'calendario': 'Evento de Calendario',
    'filiales': 'Filial',
    'anexos': 'Anexo',
    'zonas': 'Zona'
  };
  return labels[type] || type;
}

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

    const { auditLogId, entityType, action, description, branchId } = req.body;

    if (!auditLogId) {
      return res.status(400).json({ error: 'auditLogId es requerido' });
    }

    // Obtener detalles del audit log
    const { data: auditLog, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('audit_id', auditLogId)
      .single();

    if (auditError || !auditLog) {
      return res.status(404).json({ error: 'Registro de auditoría no encontrado' });
    }

    // Parsear valores JSON
    if (auditLog.old_values) {
      auditLog.old_values = JSON.parse(auditLog.old_values);
    }
    if (auditLog.new_values) {
      auditLog.new_values = JSON.parse(auditLog.new_values);
    }

    // Obtener información del usuario
    const { data: systemUser } = await supabaseAdmin
      .from('system_users')
      .select('members (first_name, last_name)')
      .eq('user_id', auditLog.user_id)
      .single();

    const userName = systemUser?.members 
      ? `${systemUser.members.first_name} ${systemUser.members.last_name}`
      : 'Usuario desconocido';

    // Obtener nombre de filial si existe
    let branchName = null;
    if (branchId) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('name')
        .eq('branch_id', branchId)
        .single();
      branchName = branch?.name;
    }

    // Generar HTML del email
    const htmlContent = generateEmailHTML(auditLog, userName, branchName);

    // Obtener correos de administradores
    const { data: adminUsers } = await supabaseAdmin
      .from('system_users')
      .select('user_id, members (email)')
      .gte('role_id', 1); // Gestores y Administradores

    const adminEmails = adminUsers
      ?.filter(u => u.members?.email)
      .map(u => u.members.email) || [];

    if (adminEmails.length === 0) {
      console.warn('No se encontraron emails de administradores');
      return res.status(200).json({ 
        message: 'Auditoría registrada pero no hay administradores para notificar' 
      });
    }

    // Enviar emails
    const emailPromises = adminEmails.map(email =>
      (async () => {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@membresia.app',
            to: email,
            subject: `[Auditoría] ${action} - ${formatEntityType(entityType)}`,
            html: htmlContent,
            replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER
          });

          // Registrar envío exitoso
          await supabaseAdmin
            .from('audit_email_log')
            .insert({
              audit_id: auditLogId,
              recipient_email: email,
              subject: `[Auditoría] ${action} - ${formatEntityType(entityType)}`,
              status: 'sent'
            });

          console.log(`✅ Email de auditoría enviado a ${email}`);
        } catch (emailError) {
          console.error(`❌ Error enviando email a ${email}:`, emailError);

          // Registrar error
          await supabaseAdmin
            .from('audit_email_log')
            .insert({
              audit_id: auditLogId,
              recipient_email: email,
              subject: `[Auditoría] ${action} - ${formatEntityType(entityType)}`,
              status: 'failed',
              error_message: emailError.message
            });
        }
      })()
    );

    await Promise.all(emailPromises);

    return res.status(200).json({ 
      success: true,
      message: `Notificaciones enviadas a ${adminEmails.length} administrador(es)`
    });
  } catch (error) {
    console.error('Error en notificación de auditoría:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
