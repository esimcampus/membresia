// import node module libraries
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import { logAudit } from 'lib/auditLog';
import { toTitleCase as toTitleCaseES } from 'lib/textFormatters';
import { useUserPermissions } from 'hooks/useUserPermissions';

const AnnexFormModal = ({ show, onHide, branchId, annexData = null, onSave }) => {
  const { isManager } = useUserPermissions();
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [isCreatingNewState, setIsCreatingNewState] = useState(false);
  const [isCreatingNewCity, setIsCreatingNewCity] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    postal_code: '',
    is_headquarters: false
  });

  useEffect(() => {
    loadCountries();
    loadZones();
  }, []);

  // Recargar zonas cuando el modal se abre (para asegurar que están disponibles)
  useEffect(() => {
    if (show) {
      console.log('📂 Modal abierto, recargando datos... branchId:', branchId);
      loadZones();
      loadCountries();
      
      // Si no estamos editando, recargamos los datos de la rama
      if (!annexData && branchId) {
        console.log('🔄 Recargando datos de rama en apertura del modal');
        loadBranchDataOnOpen();
      }
    }
  }, [show]);

  // Cargar país de la filial (branch) y fijarlo como no editable
  useEffect(() => {
    const loadBranchCountry = async () => {
      if (!branchId) {
        console.log('⚠️ No hay branchId');
        return;
      }
      try {
        console.log('📥 Cargando datos de branch:', branchId);
        const { data, error } = await supabase
          .from('branches')
          .select('country_id, zone_id, countries(name)')
          .eq('branch_id', branchId)
          .single();
        
        if (error) {
          console.error('Error en la query:', error);
          return;
        }
        
        if (data) {
          console.log('✅ Datos de branch cargados:', data);
          setSelectedCountryId(data.country_id);
          // Establecer directamente el nombre del país desde la relación
          if (data.countries) {
            setCountryName(data.countries.name);
            console.log('✅ País seteado desde branch:', data.countries.name);
          }
          setSelectedBranchId(branchId);
          setSelectedZoneId(data.zone_id || '');
          // Cargar filiales de la zona
          if (data.zone_id) {
            console.log('📥 Cargando filiales para zone:', data.zone_id);
            await loadBranches(data.zone_id);
          }
        }
      } catch (e) {
        console.error('Error obteniendo datos de la filial:', e);
      }
    };
    loadBranchCountry();
  }, [branchId]);

  useEffect(() => {
    if (annexData) {
      // Modo edición
      setFormData({
        name: annexData.name || '',
        description: annexData.description || '',
        address: annexData.address || '',
        phone: annexData.phone || '',
        email: annexData.email || '',
        postal_code: annexData.postal_code || '',
        is_headquarters: annexData.is_headquarters || false
      });
      
      if (annexData.city_id) {
        setSelectedCityId(annexData.city_id);
        // Cargar datos de ubicación
        loadLocationData(annexData.city_id);
      }
      
      // Cargar branch actual del anexo
      loadAnnexBranch(annexData.annex_id);
    } else {
      // Modo crear - resetear
      resetForm();
      // En modo crear, la zona y branch se cargan de la prop branchId
      setSelectedBranchId(branchId || '');
    }
  }, [annexData, show, branchId]);

  useEffect(() => {
    if (selectedCountryId) {
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
      loadCities(selectedStateId);
      setSelectedCityId('');
      setCityInput('');
      setIsCreatingNewCity(false);
    }
  }, [selectedStateId]);

  useEffect(() => {
    if (selectedZoneId && annexData) {
      loadBranches(selectedZoneId);
    }
  }, [selectedZoneId, annexData]);

  // Actualizar el nombre del país cuando cambia selectedCountryId (fallback)
  useEffect(() => {
    console.log('🔄 Efecto fallback. selectedCountryId:', selectedCountryId, 'countryName:', countryName);
    if (selectedCountryId && !countryName && countries.length > 0) {
      const country = countries.find(c => c.country_id === selectedCountryId);
      if (country) {
        setCountryName(country.name);
        console.log('✅ País actualizado desde fallback:', country.name);
      }
    }
  }, [selectedCountryId, countries, countryName]);

  const loadLocationData = async (cityId) => {
    try {
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('city_id, name, zip_code, state_id, states(state_id, name, country_id)')
        .eq('city_id', cityId)
        .single();

      if (cityError) throw cityError;

      if (city && city.states) {
        setSelectedCountryId(city.states.country_id);
        await loadStates(city.states.country_id);
        setSelectedStateId(city.states.state_id);
        await loadCities(city.states.state_id);
        setSelectedCityId(city.city_id);
        
        if (city.zip_code) {
          setFormData(prev => ({ ...prev, postal_code: city.zip_code }));
        }
      }
    } catch (e) {
      console.error('Error cargando datos de ubicación:', e);
    }
  };

  const loadBranchDataOnOpen = async () => {
    if (!branchId) return;
    try {
      console.log('📥 Cargando datos de branch en apertura:', branchId);
      const { data, error } = await supabase
        .from('branches')
        .select('country_id, zone_id, countries(name)')
        .eq('branch_id', branchId)
        .single();
      
      if (error) {
        console.error('Error en la query:', error);
        return;
      }
      
      if (data) {
        console.log('✅ Datos de branch en apertura cargados:', data);
        setSelectedCountryId(data.country_id);
        // Establecer directamente el nombre del país desde la relación
        if (data.countries) {
          setCountryName(data.countries.name);
          console.log('✅ País seteado en apertura:', data.countries.name);
        }
        setSelectedBranchId(branchId);
        setSelectedZoneId(data.zone_id || '');
        // Cargar filiales de la zona
        if (data.zone_id) {
          console.log('📥 Cargando filiales para zone:', data.zone_id);
          await loadBranches(data.zone_id);
        }
      }
    } catch (e) {
      console.error('Error obteniendo datos de la filial en apertura:', e);
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

  const loadZones = async () => {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('zone_id, name')
        .order('name');
      
      if (error) throw error;
      console.log('✅ Zonas cargadas:', data);
      setZones(data || []);
    } catch (e) {
      console.error('Error cargando zonas:', e);
    }
  };

  const loadBranches = async (zoneId) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, name')
        .eq('zone_id', zoneId)
        .order('name');
      
      if (error) throw error;
      console.log('✅ Filiales cargadas para zona:', zoneId, data);
      setBranches(data || []);
    } catch (e) {
      console.error('Error cargando filiales:', e);
    }
  };

  const loadAnnexBranch = async (annexId) => {
    try {
      const { data, error } = await supabase
        .from('annexes')
        .select('branch_id, branches(zone_id)')
        .eq('annex_id', annexId)
        .single();
      
      if (!error && data && data.branches) {
        setSelectedBranchId(data.branch_id);
        setSelectedZoneId(data.branches.zone_id);
        await loadBranches(data.branches.zone_id);
      }
    } catch (e) {
      console.error('Error cargando filial del anexo:', e);
    }
  }

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Formateo Title Case al salir del campo, sin interferir con la escritura
  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'name' || name === 'address') {
      setFormData(prev => ({ ...prev, [name]: toTitleCaseES(value) }));
    }
  };

  // País fijo por filial: no permitimos cambiarlo
  const handleCountryChange = () => {};

  const handleZoneChange = (e) => {
    const zoneId = e.target.value;
    console.log('🔄 Zona seleccionada:', zoneId);
    setSelectedZoneId(zoneId);
    setSelectedBranchId('');
    if (zoneId) {
      console.log('📥 Llamando a loadBranches...');
      loadBranches(zoneId);
    } else {
      setBranches([]);
    }
  };

  const handleBranchChange = (e) => {
    setSelectedBranchId(e.target.value);
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
      setStateInput(toTitleCase(value));
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
      setFormData(prev => ({ ...prev, postal_code: '' }));
    } else {
      setIsCreatingNewCity(false);
      const selectedCity = cities.find(c => String(c.city_id) === String(value));
      setSelectedCityId(value);
      setCityInput('');
      if (selectedCity && selectedCity.zip_code) {
        setFormData(prev => ({ ...prev, postal_code: selectedCity.zip_code }));
      }
    }
  };

  const handleCityInputChange = (e) => {
    const value = e.target.value;
    if (value === value.toUpperCase() && value.length > 1) {
      setCityInput(toTitleCase(value));
    } else {
      setCityInput(value);
    }
  };

  const cancelNewCity = () => {
    setIsCreatingNewCity(false);
    setCityInput('');
  };

  const createState = async (name, countryId) => {
    try {
      const formattedName = toTitleCase(name.trim());
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
      const formattedName = toTitleCase(name.trim());
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Por favor ingrese el nombre del anexo');
      return;
    }

    if (!selectedCountryId) {
      alert('Por favor seleccione un país');
      return;
    }

    if (annexData && !selectedBranchId) {
      alert('Por favor seleccione una filial');
      return;
    }

    // Usar selectedBranchId si se está editando, sino usar branchId
    const finalBranchId = annexData ? selectedBranchId : branchId;

    setSaving(true);
    try {
      // Crear estado si es necesario
      let finalStateId = selectedStateId;
      if (isCreatingNewState && stateInput.trim()) {
        finalStateId = await createState(stateInput.trim(), selectedCountryId);
        if (!finalStateId) {
          setSaving(false);
          return;
        }
      }

      // Crear ciudad si es necesario
      let finalCityId = selectedCityId;
      if (isCreatingNewCity && cityInput.trim() && finalStateId) {
        if (!formData.postal_code.trim()) {
          alert('Por favor ingrese el código postal para la nueva ciudad');
          setSaving(false);
          return;
        }
        finalCityId = await createCity(cityInput.trim(), finalStateId, formData.postal_code.trim());
        if (!finalCityId) {
          setSaving(false);
          return;
        }
      }

      const annexPayload = {
        branch_id: finalBranchId,
        name: toTitleCaseES(formData.name.trim()),
        description: formData.description.trim() || null,
        address: (formData.address ? toTitleCaseES(formData.address.trim()) : null),
        city_id: finalCityId || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        is_headquarters: formData.is_headquarters,
        is_active: true
      };

      let result;
      if (annexData) {
        // Actualizar
        result = await supabase
          .from('annexes')
          .update(annexPayload)
          .eq('annex_id', annexData.annex_id)
          .select()
          .single();
      } else {
        // Crear
        result = await supabase
          .from('annexes')
          .insert(annexPayload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (annexData) {
        await logAudit({
          entityType: 'anexos',
          entityId: annexData.annex_id,
          action: 'UPDATE',
          oldValues: annexData,
          newValues: annexPayload,
          description: `Anexo actualizado: ${annexPayload.name}`,
          branchId: finalBranchId,
          sendEmail: true
        });
      } else {
        await logAudit({
          entityType: 'anexos',
          entityId: result.data?.annex_id,
          action: 'CREATE',
          newValues: annexPayload,
          description: `Anexo creado: ${annexPayload.name}`,
          branchId: finalBranchId,
          sendEmail: true
        });
      }

      alert(annexData ? 'Anexo actualizado correctamente' : 'Anexo creado correctamente');
      onSave();
      handleClose();
    } catch (error) {
      console.error('Error guardando anexo:', error);
      alert('Error al guardar el anexo: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = (preserveCountry = true) => {
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      postal_code: '',
      is_headquarters: false
    });
    if (!preserveCountry) {
      setSelectedCountryId('');
      setCountryName('');
    }
    setSelectedStateId('');
    setSelectedCityId('');
    setSelectedZoneId('');
    setSelectedBranchId('');
    setStateInput('');
    setCityInput('');
    setIsCreatingNewState(false);
    setIsCreatingNewCity(false);
    setBranches([]);
  };

  const handleDelete = async () => {
    // Verificar si es la sede principal
    if (formData.is_headquarters) {
      alert('⚠️ No se puede eliminar la sede principal.\n\nPara eliminar este anexo debe:\n1. Asignar otro anexo como sede principal, O\n2. Eliminar toda la Filial');
      return;
    }

    // Verificar si el anexo tiene miembros asignados
    if (annexData?.members && annexData.members.length > 0) {
      alert(`No se puede eliminar el anexo porque tiene ${annexData.members.length} miembro(s) asignado(s)`);
      return;
    }

    if (!window.confirm('¿Está seguro de que desea eliminar este anexo?')) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('annexes')
        .delete()
        .eq('annex_id', annexData.annex_id);

      if (error) throw error;

      await logAudit({
        entityType: 'anexos',
        entityId: annexData.annex_id,
        action: 'DELETE',
        oldValues: annexData,
        description: `Anexo eliminado: ${annexData.name || ''}`,
        branchId: branchId,
        sendEmail: true
      });

      alert('Anexo eliminado correctamente');
      onSave();
      handleClose();
    } catch (error) {
      console.error('Error eliminando anexo:', error);
      alert('Error al eliminar el anexo: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Al cerrar, limpiamos todo, incluido país, para evitar valores antiguos al reabrir
    resetForm(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{annexData ? 'Editar Anexo' : 'Nuevo Anexo'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Nombre del Anexo *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="Ej: Anexo Centro"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Check
                  type="checkbox"
                  name="is_headquarters"
                  label="Es anexo principal (sede)"
                  checked={formData.is_headquarters}
                  onChange={handleInputChange}
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
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripción del anexo..."
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
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="Calle y número"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Zona *</Form.Label>
                <Form.Select 
                  value={selectedZoneId} 
                  onChange={handleZoneChange}
                  disabled={annexData ? (isManager ? true : false) : true}
                >
                  <option value="">Seleccione una zona...</option>
                  {zones.map(zone => (
                    <option key={zone.zone_id} value={zone.zone_id}>
                      {zone.name}
                    </option>
                  ))}
                </Form.Select>
                {!annexData && (
                  <Form.Text className="text-muted">
                    Se carga automáticamente desde tu filial
                  </Form.Text>
                )}
                {annexData && isManager && (
                  <Form.Text className="text-muted">
                    Los Gestores no pueden cambiar la zona del anexo
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>{annexData ? 'Filial *' : 'Filial'}</Form.Label>
                <Form.Select 
                  value={selectedBranchId} 
                  onChange={handleBranchChange}
                  disabled={annexData ? (isManager ? true : false) : true}
                >
                  <option value="">Seleccione una filial...</option>
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.name}
                    </option>
                  ))}
                </Form.Select>
                {!annexData && (
                  <Form.Text className="text-muted">
                    Se carga automáticamente desde tu filial
                  </Form.Text>
                )}
                {annexData && !isManager && (
                  <Form.Text className="text-muted">
                    Puedes cambiar la filial del anexo
                  </Form.Text>
                )}
                {annexData && isManager && (
                  <Form.Text className="text-muted">
                    Los Gestores no pueden cambiar la filial del anexo
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>País *</Form.Label>
                <Form.Control
                  type="text"
                  value={countryName || 'Cargando...'}
                  readOnly
                  plaintext
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

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Código Postal {isCreatingNewCity && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Control
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
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
                  name="phone"
                  value={formData.phone}
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
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="anexo@ejemplo.com"
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        {annexData && (
          <Button 
            variant="outline-danger" 
            onClick={handleDelete}
            className="me-auto"
            disabled={saving}
          >
            Eliminar
          </Button>
        )}
        <Button variant="outline-secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AnnexFormModal;
