import { Container, Row, Col, Card, Table, Badge, Spinner, Toast, Form } from 'react-bootstrap';
import { PageHeading } from 'widgets';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { InputGroup, Button } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

const ListaMiembros = () => {
  const router = useRouter();
  const { id } = router.query; // ID de la filial desde URL
  const [filtro, setFiltro] = useState("");
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState([]);
  const [savingMap, setSavingMap] = useState({}); // { [member_id]: boolean }
  const [branchFilter, setBranchFilter] = useState(null); // Info de la filial filtrada

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

  const loadBranchInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, name')
        .eq('branch_id', id)
        .single();
      
      if (error) throw error;
      setBranchFilter(data);
      console.log('🏢 Filial filtrada:', data);
    } catch (e) {
      console.error('Error cargando info de filial:', e);
    }
  }, [id]);

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

      const { data, error } = await query;

      if (error) {
        console.error('Error cargando miembros:', error);
        showToast('Error al cargar la lista de miembros', 'danger');
        return;
      }

      // Filtrar por filial si viene el parámetro id
      let filteredData = data || [];
      if (id) {
        console.log('🔍 Filtrando miembros por filial:', id);
        filteredData = filteredData.filter(member => 
          member.annexes?.branches?.branch_id === id
        );
        console.log('✅ Miembros filtrados:', filteredData.length);
      }

      setMiembros(filteredData);
    } catch (err) {
      console.error('Error inesperado:', err);
      showToast('Error inesperado al cargar miembros', 'danger');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Cargar miembros desde Supabase
  useEffect(() => {
    if (router.isReady) {
      // cargar lista principal
      loadMiembros();
      // verificar si el usuario logueado es admin
      checkAdmin();
      // cargar roles disponibles
      loadRoles();
      // cargar info de filial si viene en URL
      if (id) {
        loadBranchInfo();
      }
    }
  }, [router.isReady, id, loadMiembros, loadBranchInfo]);

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

  const miembrosFiltrados = miembros.filter((m) => {
    const texto = `${m.first_name} ${m.last_name} ${m.national_id} ${m.annexes?.name || ''} ${m.annexes?.branches?.name || ''}`.toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  const getStandardRoleId = () => roles.find(r => r.level === 4)?.role_id;

  const getRoleName = (m) => {
    if (!m.system_users?.role_id) {
      return roles.find(r => r.level === 4)?.role_name || 'Miembro Estándar';
    }
    return roles.find(r => r.role_id === m.system_users.role_id)?.role_name || '-';
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
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        setBranchFilter(null);
                        router.push('/pages/lista-miembros', undefined, { shallow: true });
                      }}
                      style={{ 
                        whiteSpace: 'nowrap',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.85rem'
                      }}
                    >
                      <i className="fe fe-x" style={{ fontSize: '0.75rem' }}></i>
                    </Button>
                  </>
                )}
              </div>
              <p className="mb-0" style={{ color: "#4a5568" }}>
                {branchFilter 
                  ? `Miembros de la filial ${branchFilter.name} (todos los anexos)`
                  : 'Consulta y gestiona los miembros de todas las filiales.'
                }
              </p>
            </div>
            <div className="d-flex gap-2 mt-3 mt-md-0 flex-wrap">
              <Form style={{ minWidth: 260 }}>
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
                <Button variant="primary" style={{ whiteSpace: 'nowrap' }}>
                  + Nuevo
                </Button>
              </Link>
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
                  <th style={{ color: "#2a4365" }}>Nombre y Apellido</th>
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
                {miembrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="text-center text-muted py-4">
                      {filtro ? 'No se encontraron miembros con ese criterio' : 'No hay miembros registrados'}
                    </td>
                  </tr>
                ) : (
                  miembrosFiltrados.map((m) => (
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
          </div>
        )}
      </Container>
    </>
  );
};

export default ListaMiembros;
