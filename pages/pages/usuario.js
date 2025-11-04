// import node module libraries
import { useEffect, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Spinner, Toast, InputGroup } from 'react-bootstrap';
import { PageHeading } from 'widgets';
import { useRouter } from 'next/router';
import { supabase } from 'lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const UsuarioPage = () => {
  const router = useRouter();
  const { id } = router.query; // member_id
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState(null);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ email: '', is_active: true, role_id: '', password: '', password2: '' });
  const [sysUser, setSysUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });
  const [showReset, setShowReset] = useState(false);
  const [resetPwd, setResetPwd] = useState('');
  const [resetPwd2, setResetPwd2] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showResetPwd2, setShowResetPwd2] = useState(false);

  const showToast = (message, variant = 'info') => setToast({ show: true, message, variant });

  // Cargar datos base
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        // Cargar roles
        const { data: rolesData } = await supabase
          .from('roles')
          .select('role_id, role_name, level')
          .order('level');
        setRoles(rolesData || []);

        // Cargar miembro + anexo + filial
        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .select(`
            member_id, first_name, last_name, national_id,
            annexes ( branches (branch_id, name), name )
          `)
          .eq('member_id', id)
          .single();
        if (memberErr) throw memberErr;
        setMember(memberData);

        // Cargar system_user si existe
        const { data: sys, error: sysErr } = await supabase
          .from('system_users')
          .select('user_id, role_id, email, is_active, roles(level)')
          .eq('member_id', id)
          .maybeSingle();
        if (sysErr) throw sysErr;
        setSysUser(sys || null);
        const standard = (rolesData || []).find(r => r.level === 4);
        setForm({
          email: sys?.email || '',
          is_active: sys?.is_active ?? true,
          role_id: sys?.role_id || standard?.role_id || ''
        });
      } catch (e) {
        console.error('Error cargando datos del usuario:', e);
        showToast('No se pudieron cargar los datos', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isAdminCentral = member?.national_id === '99999999';

  const handleChange = (e) => {
    // Bloquear cambios para el administrador central
    if (isAdminCentral) {
      showToast('El administrador central no puede ser modificado', 'danger');
      return;
    }
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRoleSelectChange = (e) => {
    // Bloquear cambios para el administrador central
    if (isAdminCentral) {
      showToast('El administrador central no puede ser modificado', 'danger');
      return;
    }
    const newRoleId = Number(e.target.value);
    const currentRole = roles.find(r => r.role_id === Number(form.role_id));
    const nextRole = roles.find(r => r.role_id === newRoleId);
    // Si ya existe usuario del sistema y está pasando de un rol no estándar a estándar, pedir confirmación
    if (sysUser && currentRole?.level !== 4 && nextRole?.level === 4) {
      const ok = window.confirm('Está por quitar el rol del miembro y pasarlo a Miembro Estándar. ¿Desea continuar?');
      if (!ok) return; // cancelar cambio
      // cerrar UI de reset si estaba abierta
      setShowReset(false);
      setResetPwd('');
      setResetPwd2('');
    }
    setForm(prev => ({ ...prev, role_id: newRoleId }));
  };

  const handleSave = async () => {
    if (!member) return;
    
    // Bloquear guardado para el administrador central
    if (isAdminCentral) {
      showToast('El administrador central no puede ser modificado', 'danger');
      return;
    }
    
    setSaving(true);
    try {
      const selectedRole = roles.find(r => r.role_id === Number(form.role_id));
      if (!selectedRole) {
        showToast('Debe seleccionar un rol válido', 'danger');
        setSaving(false);
        return;
      }

      if (!sysUser) {
        // Crear nuevo system_user
        if (!form.email) {
          showToast('Debe ingresar un email para crear el usuario del sistema', 'danger');
          setSaving(false);
          return;
        }

        let newUserId = null;
        // Si el rol NO es estándar, requerimos contraseña y creamos usuario Auth con API admin
        if (selectedRole.level !== 4) {
          if (!form.password || form.password.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'danger');
            setSaving(false);
            return;
          }
          if (form.password !== form.password2) {
            showToast('Las contraseñas no coinciden', 'danger');
            setSaving(false);
            return;
          }
          const resp = await fetch('/api/admin/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email, password: form.password })
          });
          const payload = await resp.json();
          if (!resp.ok) {
            showToast(payload.error || 'No se pudo crear el usuario de autenticación', 'danger');
            setSaving(false);
            return;
          }
          newUserId = payload.userId;
        } else {
          // Rol estándar: generar un user_id local (sin crear Auth user)
          newUserId = uuidv4();
        }

        const insertPayload = {
          user_id: newUserId,
          member_id: member.member_id,
          role_id: Number(form.role_id),
          email: form.email,
          is_active: !!form.is_active
        };
        const { error: insErr, data: insData } = await supabase
          .from('system_users')
          .insert([insertPayload])
          .select()
          .single();
        if (insErr) throw insErr;
        setSysUser(insData);

        // Gestionar branch_managers si es nivel 2
        const branchId = member?.annexes?.branches?.branch_id;
        if (selectedRole.level === 2 && branchId) {
          const { error: bmErr } = await supabase
            .from('branch_managers')
            .upsert([{ user_id: newUserId, branch_id: branchId }], { onConflict: 'user_id,branch_id' });
          if (bmErr) throw bmErr;
        }
      } else {
        // Actualizar system_user existente
        // Si se pidió nueva contraseña, validarla y actualizar en Auth antes de guardar el resto
        if (showReset && sysUser.roles?.level !== 4) {
          if (!resetPwd || resetPwd.length < 6) {
            showToast('La nueva contraseña debe tener al menos 6 caracteres', 'danger');
            setSaving(false);
            return;
          }
          if (resetPwd !== resetPwd2) {
            showToast('Las contraseñas no coinciden', 'danger');
            setSaving(false);
            return;
          }
          const resp = await fetch('/api/admin/users/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: sysUser.user_id, password: resetPwd })
          });
          const payload = await resp.json();
          if (!resp.ok) {
            showToast(payload.error || 'No se pudo actualizar la contraseña', 'danger');
            setSaving(false);
            return;
          }
        }
        const prevRole = sysUser.roles?.level;
        // Si el rol seleccionado es estándar, eliminar system_user y cuenta Auth, y sincronizar branch_managers
        if (selectedRole.level === 4 && prevRole !== 1) {
          const branchId = member?.annexes?.branches?.branch_id;
          if (prevRole === 2 && branchId) {
            await supabase
              .from('branch_managers')
              .delete()
              .eq('user_id', sysUser.user_id)
              .eq('branch_id', branchId);
          }

          // Eliminar registro en system_users
          const { error: delSuErr } = await supabase
            .from('system_users')
            .delete()
            .eq('member_id', member.member_id);
          if (delSuErr) throw delSuErr;

          // Eliminar cuenta Auth (si existe)
          try {
            await fetch('/api/admin/users/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: sysUser.user_id })
            });
          } catch (_) {}

          // Limpiar estado local
          setSysUser(null);
          setShowReset(false);
          setResetPwd('');
          setResetPwd2('');

          showToast('Rol quitado y usuario del sistema eliminado', 'success');
          setTimeout(() => router.push('/pages/lista-miembros'), 1200);
          return;
        }
        const { error: upErr } = await supabase
          .from('system_users')
          .update({
            role_id: Number(form.role_id),
            email: form.email,
            is_active: !!form.is_active
          })
          .eq('member_id', member.member_id);
        if (upErr) throw upErr;

        const branchId = member?.annexes?.branches?.branch_id;
        // Añadir a branch_managers si ahora es nivel 2
        if (selectedRole.level === 2 && branchId) {
          const { error: bmErr } = await supabase
            .from('branch_managers')
            .upsert([{ user_id: sysUser.user_id, branch_id: branchId }], { onConflict: 'user_id,branch_id' });
          if (bmErr) throw bmErr;
        }
        // Quitar de branch_managers si antes era 2 y ya no
        if (prevRole === 2 && selectedRole.level !== 2 && branchId) {
          await supabase
            .from('branch_managers')
            .delete()
            .eq('user_id', sysUser.user_id)
            .eq('branch_id', branchId);
        }
        // Limpiar estado de reset si fue exitoso
        if (showReset) {
          setShowReset(false);
          setResetPwd('');
          setResetPwd2('');
        }
      }

      showToast('Datos guardados correctamente', 'success');
      setTimeout(() => router.push('/pages/lista-miembros'), 1200);
    } catch (e) {
      console.error('Error guardando usuario del sistema:', e);
      showToast(e.message || 'No se pudo guardar', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Nota: Si showReset=true, el guardado principal hará el reset de contraseña

  const handleRemoveRole = async () => {
    if (!sysUser) return;
    
    // Bloquear para el administrador central
    if (isAdminCentral) {
      showToast('El administrador central no puede ser modificado', 'danger');
      return;
    }
    
    const standard = roles.find(r => r.level === 4);
    if (!standard) {
      showToast('No se encontró el rol estándar', 'danger');
      return;
    }
    const ok = window.confirm('Está por quitar el rol del miembro y eliminar su usuario del sistema y acceso. ¿Desea continuar?');
    if (!ok) return;
    // Actualizar selección y guardar
    setForm(prev => ({ ...prev, role_id: standard.role_id }));
    // Si estaba abierto el reset, cerrarlo y limpiar
    setShowReset(false);
    setResetPwd('');
    setResetPwd2('');
    // Esperar setState y luego guardar
    setTimeout(() => handleSave(), 0);
  };

  if (!id || loading) {
    return (
      <Container fluid className="p-6 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
        <p className="mt-3">Cargando información...</p>
      </Container>
    );
  }

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
        <PageHeading heading="Usuario del Sistema" />
        <Card className="shadow-sm">
          <Card.Body>
            <Row className="mb-4 align-items-center">
              <Col>
                <h4 className="mb-1">{member.first_name} {member.last_name}</h4>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-secondary">DNI {member.national_id}</span>
                  <span className="badge bg-info text-dark">Filial: {member.annexes?.branches?.name || '-'}</span>
                  <span className="badge bg-light text-muted">Anexo: {member.annexes?.name || '-'}</span>
                </div>
              </Col>
            </Row>

            {isAdminCentral ? (
              <div className="text-center py-5">
                <div className="mb-4">
                  <i className="fe fe-lock" style={{ fontSize: '4rem', color: '#dc3545' }}></i>
                </div>
                <h4 className="text-danger mb-3">Administrador Central</h4>
                <p className="text-muted mb-4">
                  Este usuario es el administrador central del sistema y no puede ser modificado.
                </p>
                <Button variant="outline-secondary" onClick={() => router.push('/pages/lista-miembros')}>
                  <i className="fe fe-arrow-left me-2"></i>
                  Volver a la lista
                </Button>
              </div>
            ) : (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control 
                      type="email" 
                      name="email"
                      placeholder="correo@ejemplo.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Rol</Form.Label>
                    <Form.Select 
                      name="role_id" 
                      value={form.role_id} 
                      onChange={handleRoleSelectChange}
                    >
                      {roles.map(r => (
                        <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
                {(!sysUser && roles.find(r => r.role_id === Number(form.role_id))?.level !== 4) && (
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Contraseña</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPwd ? 'text' : 'password'}
                          name="password"
                          placeholder="Mínimo 6 caracteres"
                          value={form.password}
                          onChange={handleChange}
                        />
                        <Button variant="outline-secondary" onClick={() => setShowPwd(v => !v)}>
                          <i className={`fe fe-${showPwd ? 'eye-off' : 'eye'}`}></i>
                        </Button>
                      </InputGroup>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Repetir Contraseña</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPwd2 ? 'text' : 'password'}
                          name="password2"
                          placeholder="Repetir contraseña"
                          value={form.password2}
                          onChange={handleChange}
                        />
                        <Button variant="outline-secondary" onClick={() => setShowPwd2(v => !v)}>
                          <i className={`fe fe-${showPwd2 ? 'eye-off' : 'eye'}`}></i>
                        </Button>
                      </InputGroup>
                    </Col>
                  </Row>
                )}
                {sysUser && sysUser.roles?.level !== 4 && showReset && (
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Nueva contraseña</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showResetPwd ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          value={resetPwd}
                          onChange={(e) => setResetPwd(e.target.value)}
                        />
                        <Button variant="outline-secondary" onClick={() => setShowResetPwd(v => !v)}>
                          <i className={`fe fe-${showResetPwd ? 'eye-off' : 'eye'}`}></i>
                        </Button>
                      </InputGroup>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Repetir nueva contraseña</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showResetPwd2 ? 'text' : 'password'}
                          placeholder="Repetir contraseña"
                          value={resetPwd2}
                          onChange={(e) => setResetPwd2(e.target.value)}
                        />
                        <Button variant="outline-secondary" onClick={() => setShowResetPwd2(v => !v)}>
                          <i className={`fe fe-${showResetPwd2 ? 'eye-off' : 'eye'}`}></i>
                        </Button>
                      </InputGroup>
                    </Col>
                  </Row>
                )}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Check 
                      type="switch" 
                      id="is_active"
                      name="is_active"
                      label="Usuario activo"
                      checked={!!form.is_active}
                      onChange={handleChange}
                    />
                  </Col>
                </Row>
                <div className="d-flex flex-column gap-3">
                  {/* Primera fila: Nueva Contraseña y Quitar rol */}
                  {sysUser && roles.find(r => r.role_id === Number(form.role_id))?.level !== 4 && (
                    <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end">
                      {!showReset && (
                        <Button variant="warning" onClick={() => setShowReset(true)} disabled={saving}>
                          <i className="fe fe-key me-1"></i> Nueva Contraseña
                        </Button>
                      )}
                      <Button variant="outline-danger" onClick={handleRemoveRole} disabled={saving}>
                        <i className="fe fe-user-x me-1"></i> Quitar rol
                      </Button>
                    </div>
                  )}
                  {/* Segunda fila: Guardar y Cancelar */}
                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <Button variant="primary" disabled={saving} onClick={handleSave}>
                      {saving ? (<><Spinner animation="border" size="sm" className="me-2"/> Guardando...</>) : 'Guardar'}
                    </Button>
                    <Button variant="outline-secondary" onClick={() => router.push('/pages/lista-miembros')} disabled={saving}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default UsuarioPage;
