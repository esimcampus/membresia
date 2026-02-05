import { useEffect, useState } from 'react';
import { supabase } from 'lib/supabaseClient';

/**
 * Hook para obtener permisos y información del usuario
 * @returns {Object} { roleId, roleLevel, roleName, memberBranchId, isManager, isAdmin, loading, error }
 */
export const useUserPermissions = () => {
  const [permissions, setPermissions] = useState({
    roleId: null,
    roleLevel: null,
    roleName: null,
    memberBranchId: null,
    isManager: false,
    isAdmin: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setPermissions(p => ({ ...p, loading: false }));
          return;
        }

        // Obtener rol del usuario
        const { data: systemUser, error: sysErr } = await supabase
          .from('system_users')
          .select('role_id, member_id, roles(level, role_name)')
          .eq('user_id', auth.user.id)
          .single();

        if (sysErr) {
          setPermissions(p => ({ ...p, loading: false, error: sysErr.message }));
          return;
        }

        const roleId = systemUser?.role_id;
        const roleLevel = systemUser?.roles?.level;
        const roleName = systemUser?.roles?.role_name;
        const isAdmin = roleLevel === 1;
        const isManager = roleLevel === 2;

        // Si es Manager, obtener su filial asignada
        let memberBranchId = null;
        if (isManager && systemUser?.member_id) {
          const { data: memberData } = await supabase
            .from('members')
            .select('annexes(branches(branch_id))')
            .eq('member_id', systemUser.member_id)
            .single();
          
          memberBranchId = memberData?.annexes?.branches?.branch_id || null;
        }

        setPermissions({
          roleId,
          roleLevel,
          roleName,
          memberBranchId,
          isManager,
          isAdmin,
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Error cargando permisos:', err);
        setPermissions(p => ({ ...p, loading: false, error: err.message }));
      }
    })();
  }, []);

  return permissions;
};
