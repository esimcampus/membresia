// import node module libraries
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Col, Row, Image, Modal, Form, Button } from "react-bootstrap";
import { supabase } from "lib/supabaseClient";

const UnidadHeader = () => {
  const router = useRouter();
  const { id } = router.query;
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    country_id: ''
  });

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (id) {
      loadBranchData();
    } else {
      setLoading(false);
      setBranch(null);
    }
  }, [id]);

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

  const loadBranchData = async () => {
    try {
      console.log('Cargando branch con id:', id);
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, name, country_id, countries(name)')
        .eq('branch_id', id)
        .single();
      
      if (error) throw error;
      console.log('Branch cargado:', data);
      setBranch(data);
    } catch (e) {
      console.error('Error cargando filial:', e);
    } finally {
      setLoading(false);
    }
  };

  // Generar handle tipo red social: sin espacios, sin puntos, todo minúsculas
  const generateHandle = (name) => {
    if (!name) return '';
    return '@' + name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z0-9]/g, '') // Quitar todo excepto letras y números
      .trim();
  };

  const handleOpenEditModal = () => {
    setEditFormData({
      name: branch?.name || '',
      country_id: branch?.country_id || ''
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBranch = async () => {
    if (!editFormData.name.trim() || !editFormData.country_id) {
      alert('Por favor complete todos los campos');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: editFormData.name.trim(),
          country_id: editFormData.country_id
        })
        .eq('branch_id', id);

      if (error) throw error;

      // Recargar datos
      await loadBranchData();
      setShowEditModal(false);
      alert('Filial actualizada correctamente');
    } catch (error) {
      console.error('Error actualizando filial:', error);
      alert('Error al actualizar la filial: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    console.log('Estado: Cargando...');
    return (
      <Row className="align-items-center">
        <Col xl={12} lg={12} md={12} xs={12}>
          <div className="text-center py-6">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        </Col>
      </Row>
    );
  }

  if (!branch) {
    console.log('Estado: No hay branch, ocultando header');
    return null; // No mostrar nada si no hay filial seleccionada
  }

  console.log('Mostrando header con branch:', branch);
  return (
    <Row className="align-items-center">
      <Col xl={12} lg={12} md={12} xs={12}>
        {/* Bg */}
        <div
          className="pt-20 rounded-top"
          style={{
            background: "url(/images/background/profile-cover.jpg) no-repeat",
            backgroundSize: "cover",
          }}
        ></div>
        <div className="bg-white rounded-bottom smooth-shadow-sm ">
          <div className="d-flex align-items-center justify-content-between pt-4 pb-6 px-4">
            <div className="d-flex align-items-center flex-wrap">
              {/* avatar */}
              <div className="avatar-xxl avatar-indicators avatar-online me-2 position-relative d-flex justify-content-end align-items-end mt-n10">
                <Image
                  src="/images/avatar/branch.jpg"
                  className="avatar-xxl rounded-circle border border-4 border-white-color-40"
                  alt=""
                />
                <Link
                  href="#!"
                  className="position-absolute top-0 right-0 me-2"
                  data-bs-toggle="tooltip"
                  data-placement="top"
                  title=""
                  data-original-title="Verificado"
                >
                  <Image
                    src="/images/svg/checked-mark.svg"
                    alt=""
                    height="30"
                    width="30"
                  />
                </Link>
              </div>
              {/* text */}
              <div className="lh-1">
                <h2 className="mb-0">
                  {branch?.name || 'Cargando...'}
                </h2>
                <p className="mb-0 d-block">{generateHandle(branch?.name)}</p>
              </div>
              {/* Mobile-only Edit button centered below the title/handle */}
              <div className="w-100 d-md-none mt-3">
                <div className="d-flex justify-content-center">
                  <Button
                    variant="outline-primary"
                    onClick={handleOpenEditModal}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Button
                variant="outline-primary"
                className="d-none d-md-inline-block"
                onClick={handleOpenEditModal}
              >
                Editar
              </Button>
            </div>
          </div>
          {/* nav */}
          <ul className="nav nav-lt-tab px-4" id="pills-tab" role="tablist">
            <li className="nav-item">
              <Link className="nav-link active" href="#">
                Información
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className="nav-link" 
                href={`/pages/calendario?id=${branch?.branch_id}`}
              >
                Eventos
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="#">
                Documentos
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className="nav-link" 
                href={`/pages/lista-miembros?id=${branch?.branch_id}`}
              >
                Miembros
              </Link>
            </li>
            
          </ul>
        </div>

        {/* Modal para editar filial */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Editar Filial</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nombre de la Filial *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Ej: Filial Buenos Aires"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>País *</Form.Label>
                <Form.Select 
                  name="country_id"
                  value={editFormData.country_id} 
                  onChange={handleEditInputChange}
                >
                  <option value="">Seleccione un país...</option>
                  {countries.map(country => (
                    <option key={country.country_id} value={country.country_id}>
                      {country.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSaveBranch}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Col>
    </Row>
  );
};

export default UnidadHeader;
