import { supabase } from './supabaseClient';

/**
 * Registra un cambio en la tabla de auditoría
 * @param {Object} params - Parámetros de auditoría
 * @param {string} params.entityType - Tipo de entidad (ej: 'miembros', 'documentos')
 * @param {string} params.entityId - ID de la entidad modificada
 * @param {string} params.action - Acción realizada (CREATE, UPDATE, DELETE)
 * @param {Object} params.oldValues - Valores anteriores (para UPDATE/DELETE)
 * @param {Object} params.newValues - Valores nuevos (para CREATE/UPDATE)
 * @param {string} params.description - Descripción legible del cambio
 * @param {string} params.branchId - ID de la filial (opcional)
 * @param {string} params.annexId - ID del anexo (opcional)
 * @param {boolean} params.sendEmail - Enviar notificación por email (default: true)
 */
export const logAudit = async (params) => {
  try {
    const {
      entityType,
      entityId,
      action,
      oldValues = null,
      newValues = null,
      description,
      branchId = null,
      annexId = null,
      sendEmail = true
    } = params;

    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error obteniendo usuario para auditoría:', userError);
      return;
    }

    // Obtener member_id del usuario
    const { data: systemUser } = await supabase
      .from('system_users')
      .select('member_id')
      .eq('user_id', user.id)
      .single();

    // Calcular número de cambios
    let changesCount = 1;
    if (oldValues && newValues && action === 'UPDATE') {
      changesCount = Object.keys(newValues).filter(key => 
        newValues[key] !== oldValues[key]
      ).length;
    }

    // Insertar en audit_logs
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        member_id: systemUser?.member_id || null,
        entity_type: entityType,
        entity_id: entityId,
        action: action.toUpperCase(),
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        description: description,
        branch_id: branchId,
        annex_id: annexId,
        ip_address: null, // Se capturará desde la API
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        changes_count: changesCount
      })
      .select()
      .single();

    if (auditError) {
      console.error('Error registrando auditoría:', auditError);
      return;
    }

    console.log('✅ Auditoría registrada:', auditLog.audit_id);

    // Enviar email si es necesario
    if (sendEmail && auditLog) {
      try {
        const response = await fetch('/api/audit/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            auditLogId: auditLog.audit_id,
            entityType: entityType,
            action: action,
            description: description,
            branchId: branchId
          })
        });

        if (!response.ok) {
          console.error('Error enviando notificación por email');
        }
      } catch (emailError) {
        console.error('Error en envío de email:', emailError);
        // No fallar la auditoría si el email falla
      }
    }

    return auditLog;
  } catch (error) {
    console.error('Error en logAudit:', error);
  }
};

/**
 * Obtiene el historial de auditoría con filtros
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const {
      entityType = null,
      branchId = null,
      action = null,
      daysBack = 30,
      limit = 50,
      offset = 0
    } = filters;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return { data: [], count: 0 };
    }

    const response = await fetch('/api/audit/get-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        entityType,
        branchId,
        action,
        daysBack,
        limit,
        offset
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error API get-logs:', response.status, errorText);
      return { data: [], count: 0, error: { status: response.status, message: errorText } };
    }

    const result = await response.json();
    return { data: result.data || [], count: result.count || 0, error: null };
  } catch (error) {
    console.error('Error obteniendo audit logs:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Obtiene detalles de cambios comparados
 */
export const getAuditDetail = async (auditId) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return null;
    }

    const response = await fetch('/api/audit/get-detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ auditId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error API get-detail:', response.status, errorText);
      return null;
    }

    const data = await response.json();

    // Parsear JSON si existen
    if (data) {
      data.old_values = data.old_values ? JSON.parse(data.old_values) : null;
      data.new_values = data.new_values ? JSON.parse(data.new_values) : null;
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo detalles de auditoría:', error);
    return null;
  }
};
