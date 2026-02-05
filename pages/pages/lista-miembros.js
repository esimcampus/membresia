import { Container, Row, Col, Card, Table, Badge, Spinner, Toast, Form, Pagination } from 'react-bootstrap';
import { PageHeading } from 'widgets';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { InputGroup, Button } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { useActiveBranch } from 'context/ActiveBranchContext';
import { logAudit } from 'lib/auditLog';
import { useUserPermissions } from 'hooks/useUserPermissions';

const ListaMiembros = () => {
  const router = useRouter();
  const { id } = router.query; // ID de la filial desde URL
  const { activeBranchId, clearActiveBranch } = useActiveBranch();
  const { isManager, memberBranchId, loading: permLoading } = useUserPermissions();
  // Si es Manager, forzar que vea solo su filial
  const effectiveId = useMemo(() => {
    if (isManager && memberBranchId) return String(memberBranchId);
    return id || activeBranchId || null;
  }, [id, activeBranchId, isManager, memberBranchId]);
  const [filtro, setFiltro] = useState("");
  const [miembrosBase, setMiembrosBase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState([]);
  const [savingMap, setSavingMap] = useState({}); // { [member_id]: boolean }
  const [branchFilter, setBranchFilter] = useState(null); // Info de la filial filtrada
  const [annexes, setAnnexes] = useState([]);
  const [selectedAnnexId, setSelectedAnnexId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Activo');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Si Manager y aún no tiene ID efectivo cargado, mostrar spinner
  useEffect(() => {
    if (isManager && !memberBranchId && !permLoading) {
      // Forzar redirección si no tiene filial asignada
      showToast('No tienes una filial asignada', 'danger');
      router.push('/pages/calendario');
    }
  }, [isManager, memberBranchId, permLoading]);

  const showToast = (message, variant = 'info') => {
    setToast({ show: true, message, variant });
  };

  // Calcular edad desde fecha de nacimiento
  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const loadBranchInfo = useCallback(async (branchId) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, name')
        .eq('branch_id', branchId)
        .single();
      
      if (error) throw error;
      setBranchFilter(data);
      console.log('🏢 Filial filtrada:', data);
    } catch (e) {
      console.error('Error cargando info de filial:', e);
    }
  }, []);

  const loadAnnexes = useCallback(async (branchId) => {
    if (!branchId) {
      setAnnexes([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('annexes')
        .select('annex_id, name, branch_id')
        .eq('branch_id', branchId)
        .order('name');
      if (error) throw error;
      setAnnexes(data || []);
    } catch (e) {
      console.error('Error cargando anexos:', e);
    }
  }, []);

  const loadMiembros = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
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

      // NO filtrar aquí - solo obtener datos base
      const { data, error } = await query;

      if (error) {
        console.error('Error cargando miembros:', error);
        showToast('Error al cargar la lista de miembros', 'danger');
        return;
      }

      // Filtrar en JavaScript POR FILIAL si effectiveId existe
      let filteredData = data || [];
      if (effectiveId) {
        console.log('🔍 Filtrando miembros por filial:', effectiveId);
        filteredData = filteredData.filter(m => 
          String(m.annexes?.branches?.branch_id) === String(effectiveId)
        );
      }

      const sorted = filteredData.slice().sort((a, b) => {
        const aAnnex = (a.annexes?.name || '').toLowerCase();
        const bAnnex = (b.annexes?.name || '').toLowerCase();
        if (aAnnex < bAnnex) return -1;
        if (aAnnex > bAnnex) return 1;
        const aLast = (a.last_name || '').toLowerCase();
        const bLast = (b.last_name || '').toLowerCase();
        if (aLast < bLast) return -1;
        if (aLast > bLast) return 1;
        return 0;
      });
      
      console.log('✅ Miembros cargados y filtrados:', sorted.length);
      setMiembrosBase(sorted);
    } catch (err) {
      console.error('Error inesperado:', err);
      showToast('Error inesperado al cargar miembros', 'danger');
    } finally {
      setLoading(false);
    }
  }, [effectiveId]);

  // Cargar miembros desde Supabase
  useEffect(() => {
    if (router.isReady) {
      loadMiembros();
      checkAdmin();
      loadRoles();
      if (effectiveId) {
        loadBranchInfo(effectiveId);
        loadAnnexes(effectiveId);
      } else {
        setBranchFilter(null);
        setAnnexes([]);
        setSelectedAnnexId('');
      }
    }
  }, [router.isReady, effectiveId, loadMiembros, loadBranchInfo, loadAnnexes]);

  // Si es Manager sin ID efectivo y tiene permiso cargado, forzar redirección
  useEffect(() => {
    if (!permLoading && isManager && !memberBranchId && router.isReady) {
      showToast('No tienes una filial asignada como Gestor', 'danger');
      router.push('/pages/calendario');
    }
  }, [permLoading, isManager, memberBranchId, router.isReady]);

  useEffect(() => {
    setSelectedAnnexId('');
  }, [effectiveId]);

  useEffect(() => {
    if (selectedAnnexId && !annexes.some(a => String(a.annex_id) === String(selectedAnnexId))) {
      setSelectedAnnexId('');
    }
  }, [annexes, selectedAnnexId]);

  // Cambios de filtro o filial reinician paginación
  useEffect(() => {
    setCurrentPage(1);
  }, [filtro, effectiveId, selectedAnnexId, selectedStatus]);

  const checkAdmin = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data: sys, error } = await supabase
        .from('system_users')
        .select('role_id, roles (level, role_name)')
        .eq('user_id', user.id)
        .single();
      if (error) {
        setIsAdmin(false);
        return;
      }
      const level = sys?.roles?.level;
      const name = sys?.roles?.role_name;
      setIsAdmin(level === 1 || name === 'Administrador');
    } catch (e) {
      setIsAdmin(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('role_id, role_name, level')
        .order('level');
      if (!error) setRoles(data || []);
    } catch (e) {
      // ignore
    }
  };

  const statusOptions = useMemo(() => {
    const source = miembrosBase
      .filter((m) => m.national_id !== '99999999')
      .filter((m) => {
        if (selectedAnnexId) return String(m.annexes?.annex_id) === String(selectedAnnexId);
        if (effectiveId) return m.annexes?.branches?.branch_id === effectiveId;
        return true;
      })
      .filter((m) => {
        const texto = `${m.first_name} ${m.last_name} ${m.national_id} ${m.annexes?.name || ''} ${m.annexes?.branches?.name || ''}`.toLowerCase();
        return texto.includes(filtro.toLowerCase());
      });

    const unique = new Set(source.map(m => m.member_statuses?.name).filter(Boolean));
    unique.add('Activo');
    return Array.from(unique).sort((a, b) => {
      if (a === 'Activo') return -1;
      if (b === 'Activo') return 1;
      return a.localeCompare(b);
    });
  }, [miembrosBase, selectedAnnexId, effectiveId, filtro]);

  useEffect(() => {
    if (!selectedStatus) {
      setSelectedStatus('Activo');
    }
  }, [statusOptions, selectedStatus]);

  const miembrosFiltrados = miembrosBase
    // Ocultar administrador central
    .filter((m) => m.national_id !== '99999999')
    // Filtro por estado
    .filter((m) => {
      if (!selectedStatus) return true;
      return m.member_statuses?.name === selectedStatus;
    })
    // Filtro por anexo (prioridad) o filial
    .filter((m) => {
      if (selectedAnnexId) return String(m.annexes?.annex_id) === String(selectedAnnexId);
      if (effectiveId) return m.annexes?.branches?.branch_id === effectiveId;
      return true;
    })
    // Búsqueda por texto
    .filter((m) => {
      const texto = `${m.first_name} ${m.last_name} ${m.national_id} ${m.annexes?.name || ''} ${m.annexes?.branches?.name || ''}`.toLowerCase();
      return texto.includes(filtro.toLowerCase());
    });

  // Paginación en cliente (máx 50 por página)
  const totalItems = miembrosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = miembrosFiltrados.slice(startIndex, endIndex);

  const getStandardRoleId = () => roles.find(r => r.level === 4)?.role_id;

  const getRoleName = (m) => {
    if (!m.system_users?.role_id) {
      return roles.find(r => r.level === 4)?.role_name || 'Miembro Estándar';
    }
    return roles.find(r => r.role_id === m.system_users.role_id)?.role_name || '-';
  };

  const exportCsv = (rows, filename = 'miembros.csv') => {
    if (!rows || rows.length === 0) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }
    const headers = ['Nombre', 'DNI', 'Edad', 'Filial', 'Anexo', 'Teléfono', 'Nacionalidad', 'Estado'];
    const csvRows = rows.map(m => {
      const nombre = `${m.first_name} ${m.last_name}`.replace(/"/g, '""');
      const filial = (m.annexes?.branches?.name || '').replace(/"/g, '""');
      const anexo = (m.annexes?.name || '').replace(/"/g, '""');
      const telefono = (m.phone || '').replace(/"/g, '""');
      const nacionalidad = (m.countries?.name || '').replace(/"/g, '""');
      const estado = (m.member_statuses?.name || '').replace(/"/g, '""');
      return [
        `"${nombre}"`,
        `"${m.national_id || ''}"`,
        `"${calculateAge(m.date_of_birth)}"`,
        `"${filial}"`,
        `"${anexo}"`,
        `"${telefono}"`,
        `"${nacionalidad}"`,
        `"${estado}"`
      ].join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRoleChange = async (m, newRoleId) => {
    // Mapear saving por miembro
    setSavingMap(prev => ({ ...prev, [m.member_id]: true }));
    try {
      // Obtener info de rol anterior y nuevo
      const prevRoleId = m.system_users?.role_id || null;
      const prevRole = roles.find(r => r.role_id === prevRoleId);
      const newRole = roles.find(r => r.role_id === Number(newRoleId));

      // Si no hay system_user y el nuevo rol es estándar, no hacemos nada especial
      if (!m.system_users && newRole?.level === 4) {
        showToast('Rol establecido como Miembro Estándar (predeterminado).', 'success');
        return;
      }

      // Si no hay system_user y el nuevo rol NO es estándar, no podemos crear usuario aquí
      if (!m.system_users && newRole?.level !== 4) {
        showToast('Este miembro no tiene usuario del sistema. Crea el usuario antes de asignar roles avanzados.', 'danger');
        return;
      }

      // Actualizar/crear system_users
      if (m.system_users) {
        const { error: upErr } = await supabase
          .from('system_users')
          .update({ role_id: Number(newRoleId) })
          .eq('member_id', m.member_id);
        if (upErr) {
          console.error('Error actualizando rol:', upErr);
          showToast(upErr.message || 'No se pudo actualizar el rol', 'danger');
          return;
        }

        // Auditar cambio de rol
        if (prevRoleId !== Number(newRoleId)) {
          try {
            console.log('📝 Registrando auditoría de cambio de rol...');
            await logAudit({
              entityType: 'system_users',
              entityId: m.system_users.user_id,
              action: 'UPDATE',
              description: `Rol actualizado de ${prevRole?.role_name} a ${newRole?.role_name} para ${m.first_name} ${m.last_name}`,
              oldValues: { role_id: prevRoleId, role_name: prevRole?.role_name },
              newValues: { role_id: Number(newRoleId), role_name: newRole?.role_name },
              sendEmail: true
            });
            console.log('✅ Auditoría de cambio de rol registrada correctamente');
          } catch (auditErr) {
            console.error('❌ Error registrando auditoría de cambio de rol:', auditErr);
          }
        }

        // Gestionar branch_managers si cambia a nivel 2 (Gestor de Filiales)
        const userId = m.system_users.user_id;
        const branchId = m.annexes?.branches?.branch_id;
        if (newRole?.level === 2 && userId && branchId) {
          const { error: bmErr } = await supabase
            .from('branch_managers')
            .upsert([{ user_id: userId, branch_id: branchId }], { onConflict: 'user_id,branch_id' });
          if (bmErr) {
            console.error('Error asignando gestor de filial:', bmErr);
            showToast('Rol actualizado, pero no se pudo asignar como Gestor de Filial.', 'danger');
            return;
          }
        }
        // Si el rol anterior era 2 y el nuevo no, eliminar asignación
        if (prevRole?.level === 2 && newRole?.level !== 2) {
          const userId2 = m.system_users.user_id;
          const branchId2 = m.annexes?.branches?.branch_id;
          if (userId2 && branchId2) {
            await supabase
              .from('branch_managers')
              .delete()
              .eq('user_id', userId2)
              .eq('branch_id', branchId2);
          }
        }

        showToast('Rol actualizado correctamente', 'success');
        // Refrescar la lista para ver cambios
        await loadMiembros();
      }
    } catch (e) {
      console.error('Error cambiando rol:', e);
      showToast('Error inesperado al cambiar el rol', 'danger');
    } finally {
      setSavingMap(prev => ({ ...prev, [m.member_id]: false }));
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, minWidth: '300px', maxWidth: '500px' }}>
        <Toast
          bg={toast.variant}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
          show={toast.show}
          delay={3000}
          autohide
        >
          <Toast.Body className={toast.variant !== 'light' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </div>
      <Container fluid className="p-6">
        <Card className="mb-4 shadow-sm border-0" style={{ background: "#f8fafc" }}>
          <Card.Body className="d-flex flex-column flex-md-row align-items-center justify-content-between" style={{ background: "#e3e7ed" }}>
            <div>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <h2 className="mb-0" style={{ color: "#2a4365", fontWeight: 700 }}>Lista de Miembros</h2>
                {branchFilter && (
                  <>
                    <Badge bg="info" className="px-3 py-2">
                      <i className="fe fe-filter me-1"></i>
                      {branchFilter.name}
                    </Badge>
                    {!isManager && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setBranchFilter(null);
                          if (id) {
                            router.push('/pages/lista-miembros', undefined, { shallow: true });
                          } else if (activeBranchId) {
                            clearActiveBranch();
                          }
                        }}
                        style={{ 
                          whiteSpace: 'nowrap',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        <i className="fe fe-x" style={{ fontSize: '0.75rem' }}></i>
                      </Button>
                    )}
                  </>
                )}
              </div>
              <p className="mb-0" style={{ color: "#4a5568" }}>
                {branchFilter 
                  ? `Miembros de la filial ${branchFilter.name}`
                  : 'Consulta y gestiona los miembros de todas las filiales.'
                }
              </p>
            </div>
            <div className="d-flex flex-column gap-2 mt-3 mt-md-0 w-100 align-items-end">
              {/* Primera fila: Búsqueda + Nuevo */}
              <div className="d-flex flex-row gap-2 w-100 justify-content-end align-items-center">
                <Form style={{ width: '100%', maxWidth: '320px' }}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Buscar por nombre o DNI..."
                      value={filtro}
                      onChange={e => setFiltro(e.target.value)}
                      style={{ borderRadius: "20px" }}
                    />
                  </InputGroup>
                </Form>
                <Link href="/pages/miembro" passHref legacyBehavior>
                  <Button variant="primary" style={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
                    + Nuevo
                  </Button>
                </Link>
              </div>
              {/* Segunda fila: Filtro estado + anexo + Excel */}
              <div className="d-flex flex-row gap-2 w-100 justify-content-end align-items-center">
                <Form style={{ width: '100%', maxWidth: '200px' }}>
                  <Form.Select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Form.Select>
                </Form>
                <Form style={{ width: '100%', maxWidth: '280px' }}>
                  <Form.Select
                    value={selectedAnnexId}
                    onChange={(e) => setSelectedAnnexId(e.target.value)}
                  >
                    <option value="">Todos los anexos</option>
                    {annexes.map(a => (
                      <option key={a.annex_id} value={a.annex_id}>{a.name}</option>
                    ))}
                  </Form.Select>
                </Form>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{ minWidth: '40px', height: '38px' }}
                  onClick={() => exportCsv(miembrosFiltrados, 'miembros.xls')}
                  title="Descargar Excel"
                >
                  <i className="fe fe-download" style={{ fontSize: '18px' }}></i>
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
            <p className="mt-3">Cargando miembros...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table bordered hover className="align-middle">
              <thead style={{ background: "#e3e7ed" }}>
                <tr>
                  <th style={{ color: "#2a4365" }}>Avatar</th>
                  <th style={{ color: "#2a4365" }}>Nombre</th>
                  <th style={{ color: "#2a4365" }}>DNI</th>
                  <th style={{ color: "#2a4365" }}>Edad</th>
                  <th style={{ color: "#2a4365" }}>Filial</th>
                  <th style={{ color: "#2a4365" }}>Anexo</th>
                  <th style={{ color: "#2a4365" }} className="d-none d-md-table-cell">Teléfono</th>
                  <th style={{ color: "#2a4365" }} className="d-none d-lg-table-cell">Nacionalidad</th>
                  <th style={{ color: "#2a4365" }}>Estado</th>
                  {isAdmin && (<th style={{ color: "#2a4365" }}>Rol</th>)}
                </tr>
         </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="text-center text-muted py-4">
                      {filtro ? 'No se encontraron miembros con ese criterio' : 'No hay miembros registrados'}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((m) => (
                    <tr key={m.member_id}>
                      <td>
                        <Image
                          src={m.avatar_url || "/images/avatar/profile.jpg"}
                          alt="avatar"
                          className="rounded-circle border border-2 border-primary"
                          width={40}
                          height={40}
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <Link href={`/pages/editar-miembro?id=${m.member_id}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                          {m.first_name} {m.last_name}
                        </Link>
                      </td>
                      <td>{m.national_id}</td>
                      <td>{calculateAge(m.date_of_birth)}</td>
                      <td>{m.annexes?.branches?.name || <span className="text-muted">-</span>}</td>
                      <td>{m.annexes?.name || <span className="text-muted">-</span>}</td>
                      <td className="d-none d-md-table-cell">{m.phone || <span className="text-muted">-</span>}</td>
                      <td className="d-none d-lg-table-cell">{m.countries?.name || <span className="text-muted">-</span>}</td>
                      <td>
                        <Badge bg={m.member_statuses?.name === "Activo" ? "success" : "secondary"}>
                          {m.member_statuses?.name || 'N/A'}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td>
                          <Link href={`/pages/usuario?id=${m.member_id}`} style={{ textDecoration: 'none' }}>
                            <span style={{ color: '#2563eb', cursor: 'pointer' }}>
                              {getRoleName(m)}
                            </span>
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
            {/* Resumen y paginación */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
              <div className="text-muted small">
                Mostrando {totalItems === 0 ? 0 : startIndex + 1} - {endIndex} de {totalItems} miembros
              </div>
              {totalPages > 1 && (
                <Pagination className="mb-0">
                  <Pagination.First disabled={currentPage === 1} onClick={() => setCurrentPage(1)} />
                  <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    // Limitar número de botones si hay muchas páginas (ej: mostrar primeros 2, últimos 2 y ventana alrededor de actual)
                    const shouldShow = totalPages <= 7 ||
                      pageNum === 1 ||
                      pageNum === 2 ||
                      pageNum === totalPages ||
                      pageNum === totalPages - 1 ||
                      Math.abs(pageNum - currentPage) <= 1;
                    if (!shouldShow) return null;
                    // Insertar puntos suspensivos donde se hace salto
                    const prevShown = pageNum > 2 && pageNum === currentPage + 2 && currentPage > 3;
                    const preEllipsis = pageNum === totalPages - 2 && currentPage < totalPages - 3;
                    return (
                      <Pagination.Item
                        key={pageNum}
                        active={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Pagination.Item>
                    );
                  })}
                  <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                  <Pagination.Last disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} />
                </Pagination>
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
};

export default ListaMiembros;
