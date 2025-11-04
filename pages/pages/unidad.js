// import node module libraries
import { useEffect, useState } from 'react';
import { Col, Row, Container, Form, Button, Modal } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { supabase } from 'lib/supabaseClient';
import { toTitleCase } from 'lib/textFormatters';

// import widget as custom components
import { PageHeading } from 'widgets'

// import sub components
import {
  UnidadInfo,
  UnidadActividad,
  UnidadEquipo,
  UnidadHeader,
  UnidadContribuciones
} from 'sub-components'

const Profile = () => {
  const router = useRouter();
  const { id } = router.query;
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    branchName: '',
    annexName: '',
    annexDescription: '',
    annexAddress: '',
    annexPostalCode: '',
    annexPhone: '',
    annexEmail: ''
  });

  // Datos de ubicación
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  
  // Input de búsqueda para nuevos registros
  const [stateInput, setStateInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [isCreatingNewState, setIsCreatingNewState] = useState(false);
  const [isCreatingNewCity, setIsCreatingNewCity] = useState(false);

  useEffect(() => {
    loadBranches();
    loadCountries();
  }, []);

  useEffect(() => {
    // Resetear selección cuando se cambia de página o se recarga
    if (!id) {
      setSelectedBranch('');
    } else {
      setSelectedBranch(id);
    }
  }, [id]);

  useEffect(() => {
    if (selectedCountryId) {
      // Al cambiar de país, limpiamos dependencias y salimos de modos de creación
      loadStates(selectedCountryId);
      setSelectedStateId('');
      setSelectedCityId('');
      setCities([]);
      setStateInput('');
      setCityInput('');
      setIsCreatingNewState(false);
      setIsCreatingNewCity(false);
    }
  }, [selectedCountryId]);

  useEffect(() => {
    if (selectedStateId && !isCreatingNewState) {
      // Al cambiar de estado, cargamos ciudades solamente si NO estamos creando estado nuevo
      loadCities(selectedStateId);
      setSelectedCityId('');
      setCityInput('');
      setIsCreatingNewCity(false);
    }
  }, [selectedStateId]);

  // Función local para capitalizar (usada solo en inputs de estado/ciudad)
  // Nota: para nombres/dirección usamos la versión compartida importada de lib/textFormatters
  const toTitleCaseLocal = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, name')
        .order('name');
      
      if (error) throw error;
      setBranches(data || []);
    } catch (e) {
      console.error('Error cargando filiales:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('country_id, name')
        .order('name');
      
      if (error) throw error;
      setCountries(data || []);
    } catch (e) {
      console.error('Error cargando países:', e);
    }
  };

  const loadStates = async (countryId) => {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('state_id, name')
        .eq('country_id', countryId)
        .order('name');
      
      if (error) throw error;
      setStates(data || []);
    } catch (e) {
      console.error('Error cargando estados:', e);
    }
  };

  const loadCities = async (stateId) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('city_id, name, zip_code')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) throw error;
      setCities(data || []);
    } catch (e) {
      console.error('Error cargando ciudades:', e);
    }
  };

  const handleBranchChange = (e) => {
    const branchId = e.target.value;
    setSelectedBranch(branchId);
    if (branchId) {
      router.push(`/pages/unidad?id=${branchId}`, undefined, { shallow: true });
    } else {
      router.push('/pages/unidad', undefined, { shallow: true });
    }
  };

  // Campos a forzar Title Case automáticamente
  const fieldFormatters = {
    branchName: toTitleCase,
    annexName: toTitleCase,
    annexDescription: undefined,
    annexAddress: toTitleCase,
    annexPostalCode: undefined,
    annexPhone: undefined,
    annexEmail: undefined
  };

  // Mientras se escribe no formateamos (para no interferir con espacios/cursor)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Al salir del campo aplicamos Title Case si corresponde
  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    const fmt = fieldFormatters[name];
    if (typeof fmt === 'function') {
      setFormData(prev => ({ ...prev, [name]: fmt(value) }));
    }
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    setSelectedCountryId(value);
  };

  const handleStateChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setIsCreatingNewState(true);
      setSelectedStateId('');
      setStateInput('');
    } else {
      setIsCreatingNewState(false);
      setSelectedStateId(value);
      setStateInput('');
    }
  };

  const handleStateInputChange = (e) => {
    const value = e.target.value;
    if (value === value.toUpperCase() && value.length > 1) {
      setStateInput(toTitleCaseLocal(value));
    } else {
      setStateInput(value);
    }
  };

  const cancelNewState = () => {
    setIsCreatingNewState(false);
    setStateInput('');
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setIsCreatingNewCity(true);
      setSelectedCityId('');
      setCityInput('');
      // Limpiar código postal para que el usuario ingrese uno nuevo
      setFormData(prev => ({ ...prev, annexPostalCode: '' }));
    } else {
      setIsCreatingNewCity(false);
      const selectedCity = cities.find(c => String(c.city_id) === String(value));
      setSelectedCityId(value);
      setCityInput('');
      // Actualizar código postal del formulario si la ciudad tiene uno
      if (selectedCity && selectedCity.zip_code) {
        setFormData(prev => ({ ...prev, annexPostalCode: selectedCity.zip_code }));
      }
    }
  };

  const handleCityInputChange = (e) => {
    const value = e.target.value;
    if (value === value.toUpperCase() && value.length > 1) {
      setCityInput(toTitleCaseLocal(value));
    } else {
      setCityInput(value);
    }
  };

  const cancelNewCity = () => {
    setIsCreatingNewCity(false);
    setCityInput('');
  };

  const createCountry = async (name) => {
    try {
      // Aplicar título case al guardar
  const formattedName = toTitleCaseLocal(name.trim());
      const { data, error } = await supabase
        .from('countries')
        .insert({ name: formattedName })
        .select()
        .single();
      
      if (error) throw error;
      await loadCountries();
      setSelectedCountryId(data.country_id);
      return data.country_id;
    } catch (e) {
      console.error('Error creando país:', e);
      alert('Error al crear el país: ' + e.message);
      return null;
    }
  };

  const createState = async (name, countryId) => {
    try {
      // Aplicar título case al guardar
  const formattedName = toTitleCaseLocal(name.trim());
      const { data, error } = await supabase
        .from('states')
        .insert({ name: formattedName, country_id: countryId })
        .select()
        .single();
      
      if (error) throw error;
      await loadStates(countryId);
      setSelectedStateId(data.state_id);
      setIsCreatingNewState(false);
      setStateInput('');
      return data.state_id;
    } catch (e) {
      console.error('Error creando estado:', e);
      alert('Error al crear el estado/provincia: ' + e.message);
      return null;
    }
  };

  const createCity = async (name, stateId, zipCode) => {
    try {
      // Aplicar título case al guardar
  const formattedName = toTitleCaseLocal(name.trim());
      const { data, error } = await supabase
        .from('cities')
        .insert({ name: formattedName, state_id: stateId, zip_code: zipCode })
        .select()
        .single();
      
      if (error) throw error;
      await loadCities(stateId);
      setSelectedCityId(data.city_id);
      setIsCreatingNewCity(false);
      setCityInput('');
      return data.city_id;
    } catch (e) {
      console.error('Error creando ciudad:', e);
      alert('Error al crear la ciudad: ' + e.message);
      return null;
    }
  };

  const handleCreateBranch = async () => {
    if (!formData.branchName || !formData.annexName) {
      alert('Por favor complete los campos obligatorios: Nombre de Filial y Nombre del Anexo Principal');
      return;
    }

    setSaving(true);
    try {
      // 1. Validar que se haya seleccionado un país
      if (!selectedCountryId) {
        alert('Por favor seleccione un país');
        setSaving(false);
        return;
      }

      // 2. Crear estado si es necesario
      let finalStateId = selectedStateId;
      if (isCreatingNewState && stateInput.trim()) {
        finalStateId = await createState(stateInput.trim(), selectedCountryId);
        if (!finalStateId) {
          setSaving(false);
          return;
        }
      }

      // 3. Crear ciudad si es necesario
      let finalCityId = selectedCityId;
      if (isCreatingNewCity && cityInput.trim() && finalStateId) {
        // Validar que se haya ingresado el código postal para ciudad nueva
        if (!formData.annexPostalCode.trim()) {
          alert('Por favor ingrese el código postal para la nueva ciudad');
          setSaving(false);
          return;
        }
        finalCityId = await createCity(cityInput.trim(), finalStateId, formData.annexPostalCode.trim());
        if (!finalCityId) {
          setSaving(false);
          return;
        }
      }

      // Obtener nombre del país para la filial
      const country = countries.find(c => c.country_id === selectedCountryId);
      if (!country) {
        alert('Error: no se pudo obtener el país seleccionado');
        setSaving(false);
        return;
      }

      // Validar ciudad obligatoria según esquema (annexes.city_id NOT NULL)
      if (!finalCityId) {
        alert('Por favor seleccione una ciudad o cree una nueva para el anexo principal');
        setSaving(false);
        return;
      }

      // 4. Crear la filial
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .insert({
          name: formData.branchName,
          // Guardamos la relación mediante la FK al país
          country_id: selectedCountryId
        })
        .select()
        .single();

      if (branchError) throw branchError;

      // 5. Crear el anexo principal (sede)
      const { data: annex, error: annexError } = await supabase
        .from('annexes')
        .insert({
          branch_id: branch.branch_id,
          name: formData.annexName,
          description: formData.annexDescription,
          address: formData.annexAddress,
          city_id: finalCityId,
          phone: formData.annexPhone,
          email: formData.annexEmail,
          is_headquarters: true,
          is_active: true
        })
        .select()
        .single();

      if (annexError) throw annexError;

      // 6. Limpiar y navegar
      await loadBranches();
      resetForm();
      setShowModal(false);
      router.push(`/pages/unidad?id=${branch.branch_id}`);
    } catch (error) {
      console.error('Error creando Filial:', error);
      alert('Error al crear la Filial: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      branchName: '',
      annexName: '',
      annexDescription: '',
      annexAddress: '',
      annexPostalCode: '',
      annexPhone: '',
      annexEmail: ''
    });
    setSelectedCountryId('');
    setSelectedStateId('');
    setSelectedCityId('');
    setStateInput('');
    setCityInput('');
    setIsCreatingNewState(false);
    setIsCreatingNewCity(false);
  };

  return (
    <Container fluid className="p-6">
      {/* Encabezado de la página */}
      <PageHeading heading="Resumen de la Filial"/>

      {/* Selector de Filial */}
      <Row className="mb-4">
        <Col md={6}>
         
          <Form.Select 
            value={selectedBranch} 
            onChange={handleBranchChange}
            disabled={loading}
          >
            <option value="">Seleccione una filial...</option>
            {branches.map(branch => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={6} className="d-flex align-items-end justify-content-center justify-content-md-end">
          <Button 
            variant="primary" 
            onClick={() => setShowModal(true)}
            className="mt-3 mt-md-0"
          >
            Nueva Filial
          </Button>
        </Col>
      </Row>

      {/* Modal para crear nueva filial */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Crear nueva Filial</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h5 className="mb-3">Datos de la Filial</h5>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Nombre de la Filial *</Form.Label>
                  <Form.Control
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder="Ej: Buenos Aires"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>País *</Form.Label>
                  <Form.Select value={selectedCountryId} onChange={handleCountryChange}>
                    <option value="">Seleccione un país...</option>
                    {countries.map(country => (
                      <option key={country.country_id} value={country.country_id}>
                        {country.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr className="my-4" />
            <h5 className="mb-3">Datos del Anexo Principal (Sede)</h5>
            
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Nombre del Anexo *</Form.Label>
                  <Form.Control
                    type="text"
                    name="annexName"
                    value={formData.annexName}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder="Ej: Sede Central Buenos Aires"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="annexDescription"
                    value={formData.annexDescription}
                    onChange={handleInputChange}
                    placeholder="Descripción de la sede principal..."
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Dirección</Form.Label>
                  <Form.Control
                    type="text"
                    name="annexAddress"
                    value={formData.annexAddress}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder="Calle y número"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Estado/Provincia</Form.Label>
                  {!isCreatingNewState ? (
                    <Form.Select 
                      value={selectedStateId} 
                      onChange={handleStateChange}
                      disabled={!selectedCountryId}
                    >
                      <option value="">Seleccione un estado/provincia...</option>
                      {states.map(state => (
                        <option key={state.state_id} value={state.state_id}>
                          {state.name}
                        </option>
                      ))}
                      <option value="new">+ Crear nuevo estado/provincia</option>
                    </Form.Select>
                  ) : (
                    <div className="d-flex gap-2 align-items-center">
                      <Form.Control
                        type="text"
                        value={stateInput}
                        onChange={handleStateInputChange}
                        placeholder="Ingrese el nombre del estado/provincia"
                        autoFocus
                      />
                      <i 
                        className="fe fe-x text-danger cursor-pointer" 
                        style={{ fontSize: '24px', cursor: 'pointer' }}
                        onClick={cancelNewState}
                        title="Cancelar"
                      />
                    </div>
                  )}
                  {(!selectedCountryId && !isCreatingNewState) && (
                    <Form.Text className="text-muted">
                      Primero seleccione un país
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {/* Cuando se elige "+ Crear nuevo estado/provincia" el select se transforma en un input de texto arriba */}

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Ciudad</Form.Label>
                  {!isCreatingNewCity ? (
                    <Form.Select 
                      value={selectedCityId} 
                      onChange={handleCityChange}
                      disabled={!selectedStateId && !isCreatingNewState}
                    >
                      <option value="">Seleccione una ciudad...</option>
                      {cities.map(city => (
                        <option key={city.city_id} value={city.city_id}>
                          {city.name}
                        </option>
                      ))}
                      <option value="new">+ Crear nueva ciudad</option>
                    </Form.Select>
                  ) : (
                    <div className="d-flex gap-2 align-items-center">
                      <Form.Control
                        type="text"
                        value={cityInput}
                        onChange={handleCityInputChange}
                        placeholder="Ingrese el nombre de la ciudad"
                        autoFocus
                      />
                      <i 
                        className="fe fe-x text-danger cursor-pointer" 
                        style={{ fontSize: '24px', cursor: 'pointer' }}
                        onClick={cancelNewCity}
                        title="Cancelar"
                      />
                    </div>
                  )}
                  {(!selectedStateId && !isCreatingNewState && !isCreatingNewCity) && (
                    <Form.Text className="text-muted">
                      Primero seleccione un estado/provincia
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {!isCreatingNewCity && cityInput && (
              <Row className="mb-3">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Nombre de la nueva ciudad</Form.Label>
                    <Form.Control
                      type="text"
                      value={cityInput}
                      onChange={handleCityInputChange}
                      placeholder="Ingrese el nombre de la ciudad"
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Código Postal {isCreatingNewCity && <span className="text-danger">*</span>}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="annexPostalCode"
                    value={formData.annexPostalCode}
                    onChange={handleInputChange}
                    disabled={selectedCityId && !isCreatingNewCity}
                    placeholder={isCreatingNewCity ? "Ingrese el código postal (obligatorio para nueva ciudad)" : ""}
                  />
                  {selectedCityId && !isCreatingNewCity && (
                    <Form.Text className="text-muted">
                      El código postal se obtuvo de la ciudad seleccionada
                    </Form.Text>
                  )}
                  {isCreatingNewCity && (
                    <Form.Text className="text-muted">
                      El código postal es obligatorio para crear una nueva ciudad
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    name="annexPhone"
                    value={formData.annexPhone}
                    onChange={handleInputChange}
                    placeholder="+54 11 1234-5678"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="annexEmail"
                    value={formData.annexEmail}
                    onChange={handleInputChange}
                    placeholder="sede@ejemplo.com"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateBranch}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Mostrar contenido solo si hay una filial seleccionada */}
      {selectedBranch && (
        <>
          {/* Encabezado de la Unidad */}
          <UnidadHeader />

          {/* contenido */}
          <div className="py-6">
            <Row>
              {/* Información de la Sede */}
              <UnidadInfo />

              {/* Contribuciones y Eventos */}
              <UnidadContribuciones />

              <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
                {/* Equipo de la Sede */}
                <UnidadEquipo />

                {/* Actividad de la Sede */}
                <UnidadActividad />
              </Col>
            </Row>
          </div>
        </>
      )}
    </Container>
  )
}

export default Profile