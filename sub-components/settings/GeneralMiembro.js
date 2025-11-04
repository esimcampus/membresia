import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, Form, Row, Col, Button, Image, Spinner, Toast } from 'react-bootstrap';
import { DropFiles, FormSelect } from 'widgets';
import { toTitleCase } from 'lib/textFormatters';
import { supabase } from 'lib/supabaseClient';

const GeneralMiembro = () => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    national_id: '',
    nationality_country_id: '',
    annex_id: '',
    residence_address: '',
    phone: '',
    marital_status_id: '',
    num_children: 0,
    date_of_birth: '',
    date_of_baptism: '',
    member_status_id: '',
    transfer_date: '',
    death_date: '',
    notes: '',
    avatar_url: '/images/avatar/profile.jpg'
  });

  // Estado para datos de Supabase
  const [annexes, setAnnexes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [memberStatusOptions, setMemberStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const topRef = useRef(null);
  const router = useRouter();
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });

  const showToast = (message, variant = 'info') => {
    setToast({ show: true, message, variant });
  };

  // Cargar datos de Supabase al montar el componente
  useEffect(() => {
    loadSupabaseData();
  }, []);

  const loadSupabaseData = async () => {
    try {
      // Cargar anexos
      const { data: annexesData, error: annexesError } = await supabase
        .from('annexes')
        .select('annex_id, name')
        .order('name');

      if (annexesError) throw annexesError;
      
      setAnnexes(
        annexesData?.map(a => ({
          value: a.annex_id,
          label: a.name
        })) || []
      );

      // Cargar países
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('country_id, name')
        .order('name');

      if (countriesError) throw countriesError;

      setCountries(
        countriesData?.map(c => ({
          value: c.country_id,
          label: c.name
        })) || []
      );

      // Cargar estados civiles desde tabla lookup
      const { data: maritalData, error: maritalError } = await supabase
        .from('marital_statuses')
        .select('marital_status_id, name')
        .eq('is_active', true)
        .order('display_order');

      if (maritalError) throw maritalError;

      setMaritalStatusOptions(
        maritalData?.map(status => ({
          value: status.marital_status_id,
          label: status.name
        })) || []
      );

      // Cargar estados de miembro desde tabla lookup
      const { data: memberStatusData, error: memberStatusError } = await supabase
        .from('member_statuses')
        .select('member_status_id, name')
        .eq('is_active', true)
        .order('display_order');

      if (memberStatusError) throw memberStatusError;

      setMemberStatusOptions(
        memberStatusData?.map(status => ({
          value: status.member_status_id,
          label: status.name
        })) || []
      );
    } catch (err) {
      console.error('Error cargando datos:', err);
      showError('Error al cargar datos desde Supabase');
    }
  };

  // Campos de texto a normalizar en Title Case
  const fieldFormatters = {
    first_name: toTitleCase,
    last_name: toTitleCase,
    residence_address: toTitleCase,
  };

  // Mientras se escribe: no formateamos para no interferir con el cursor/espacios
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Al salir del campo: aplicamos Title Case
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fmt = fieldFormatters[name];
    if (typeof fmt === 'function') {
      setFormData(prev => ({ ...prev, [name]: fmt(value) }));
    }
  };

  // Calcular edad desde fecha de nacimiento
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Función helper para mostrar errores
  const showError = (message) => {
    setError(message);
    showToast(message, 'danger');
  };

  // Función helper para mostrar éxito
  const showSuccess = (message) => {
    setSuccess(message);
    showToast(message, 'success');
  };

  // Validar formulario
  const validateForm = () => {
    if (!formData.first_name.trim()) {
      showError('El nombre es obligatorio');
      return false;
    }
    if (!formData.last_name.trim()) {
      showError('El apellido es obligatorio');
      return false;
    }
    if (!formData.national_id.trim()) {
      showError('El DNI es obligatorio');
      return false;
    }
    if (!formData.nationality_country_id) {
      showError('La nacionalidad es obligatoria');
      return false;
    }
    if (!formData.marital_status_id) {
      showError('El estado civil es obligatorio');
      return false;
    }
    if (!formData.member_status_id) {
      showError('El estado del miembro es obligatorio');
      return false;
    }
    if (!formData.date_of_birth) {
      showError('La fecha de nacimiento es obligatoria');
      return false;
    }
    return true;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Preparar datos para insertar (refuerzo: normalizar también aquí)
      const memberData = {
        first_name: toTitleCase(formData.first_name.trim()),
        last_name: toTitleCase(formData.last_name.trim()),
        national_id: formData.national_id.trim(),
        nationality_country_id: formData.nationality_country_id,
        annex_id: formData.annex_id || null,
  residence_address: (formData.residence_address ? toTitleCase(formData.residence_address.trim()) : null),
        phone: formData.phone.trim() || null,
        marital_status_id: formData.marital_status_id,
        num_children: parseInt(formData.num_children) || 0,
        date_of_birth: formData.date_of_birth,
        date_of_baptism: formData.date_of_baptism || null,
        member_status_id: formData.member_status_id,
        transfer_date: formData.transfer_date || null,
        death_date: formData.death_date || null,
        notes: formData.notes.trim() || null,
        avatar_url: formData.avatar_url || null
      };

      const { data, error: insertError } = await supabase
        .from('members')
        .insert([memberData])
        .select();

      if (insertError) {
        console.error('Error al insertar miembro:', insertError);
        
        if (insertError.code === '23505') {
          showError('Ya existe un miembro con ese DNI');
          setLoading(false);
          return;
        }
        
        showError(insertError.message || 'Error al guardar el miembro');
        setLoading(false);
        return;
      }

      showSuccess('¡Miembro creado exitosamente!');
      
      // Limpiar formulario
      setFormData({
        first_name: '',
        last_name: '',
        national_id: '',
        nationality_country_id: '',
        annex_id: '',
        residence_address: '',
        phone: '',
        marital_status_id: '',
        num_children: 0,
        date_of_birth: '',
        date_of_baptism: '',
        member_status_id: '',
        transfer_date: '',
        death_date: '',
        notes: '',
        avatar_url: '/images/avatar/profile.jpg'
      });

      // Hacer scroll hacia el inicio del Card para ver el mensaje de éxito
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Redirigir a la lista de miembros luego de 2 segundos
      setTimeout(() => {
        router.push('/pages/lista-miembros');
      }, 2000);
    } catch (err) {
      console.error('Error inesperado al guardar miembro:', err);
      showError('Error inesperado al procesar la solicitud');
      setLoading(false);
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
      <Row className="mb-8">
      <Col xl={3} lg={4} md={12} xs={12}>
        <div className="mb-4 mb-lg-0">
          <h4 className="mb-1">Ficha de Miembro</h4>
          <p className="mb-0 fs-5 text-muted">
            Completa la información personal y de membresía.
          </p>
        </div>
      </Col>
      <Col xl={9} lg={8} md={12} xs={12}>
        <Card>
          <Card.Body>
            <div ref={topRef} />
            <div className="mb-6">
              <h4 className="mb-1">Información básica</h4>
            </div>
            <Row className="align-items-center mb-8">
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-0">Avatar</h5>
              </Col>
              <Col md={9}>
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <Image 
                      src={formData.avatar_url || "/images/avatar/profile.jpg"} 
                      className="rounded-circle avatar avatar-lg" 
                      alt="" 
                    />
                  </div>
                  <div>
                    <Button variant="outline-white" className="me-2" type="button">Cambiar</Button>
                    <Button variant="outline-white" type="button">Quitar</Button>
                  </div>
                </div>
              </Col>
            </Row>
            <Row className="mb-8">
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-0">Subir foto de perfil</h5>
              </Col>
              <Col md={9}>
                <Form className="dropzone mb-3 py-10 border-dashed">
                  <DropFiles />
                </Form>
                <Form.Text>No se eligió ningún archivo</Form.Text>
              </Col>
            </Row>
            <Form onSubmit={handleSubmit}>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Nombre <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    name="first_name"
                    placeholder="Nombre" 
                    value={formData.first_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Apellido <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    name="last_name"
                    placeholder="Apellido" 
                    value={formData.last_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Filial y Anexo</Form.Label>
                  <FormSelect
                    name="annex_id"
                    placeholder="Seleccione un anexo"
                    options={annexes}
                    defaultselected={formData.annex_id}
                    onChange={handleChange}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Nacionalidad <span className="text-danger">*</span></Form.Label>
                  <FormSelect
                    name="nationality_country_id"
                    placeholder="Seleccione nacionalidad"
                    options={countries}
                    defaultselected={formData.nationality_country_id}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>DNI <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    name="national_id"
                    placeholder="DNI" 
                    value={formData.national_id}
                    onChange={handleChange}
                    required
                  />
                </Col>
                <Col md={2}>
                  <Form.Label>Edad</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Edad" 
                    value={calculateAge(formData.date_of_birth)}
                    disabled
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Domicilio</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="residence_address"
                    placeholder="Domicilio" 
                    value={formData.residence_address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Número de Tel (Opcional)</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="phone"
                    placeholder="Número de Tel" 
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Estado Civil <span className="text-danger">*</span></Form.Label>
                  <FormSelect
                    name="marital_status_id"
                    placeholder="Seleccione estado civil"
                    options={maritalStatusOptions}
                    defaultselected={formData.marital_status_id}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={2}>
                  <Form.Label>Hijos</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="num_children"
                    placeholder="0" 
                    min="0"
                    value={formData.num_children}
                    onChange={handleChange}
                  />
                </Col>
                <Col md={5}>
                  <Form.Label>Fecha de Nacimiento <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date" 
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                  />
                </Col>
                <Col md={5}>
                  <Form.Label>Fecha de Bautizmo</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="date_of_baptism"
                    value={formData.date_of_baptism}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
              <hr />
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Estado del Miembro <span className="text-danger">*</span></Form.Label>
                  <FormSelect
                    name="member_status_id"
                    placeholder="Seleccione estado"
                    options={memberStatusOptions}
                    defaultselected={formData.member_status_id}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label>Traslado Fecha (Solo si corresponde)</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="transfer_date"
                    value={formData.transfer_date}
                    onChange={handleChange}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Fecha de Defunción (Solo si corresponde)</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="death_date"
                    value={formData.death_date}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <Form.Label>Observaciones (Opcional)</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    name="notes"
                    placeholder="Notas adicionales..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
              <div className="d-flex gap-2">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </Button>
                <Button 
                  variant="outline-secondary" 
                  type="button"
                  onClick={() => router.push('/pages/lista-miembros')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
      </Row>
    </>
  );
};

export default GeneralMiembro;
