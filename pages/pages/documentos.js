import { Container, Row, Col, Card, Table, Badge, Spinner, Toast, Form, Button, Dropdown } from 'react-bootstrap';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { InputGroup } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import Link from 'next/link';

const Documentos = () => {
  const router = useRouter();
  const { id } = router.query; // ID de la filial desde URL (opcional)
  
  const [filtro, setFiltro] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });
  const [userRole, setUserRole] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [userBranches, setUserBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(null);

  const showToast = (message, variant = 'info') => {
    setToast({ show: true, message, variant });
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  // Obtener icono según tipo de archivo
  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase();
    
    const icons = {
      // PDFs
      'pdf': { icon: 'fe-file-text', color: '#e74c3c', bg: '#fce8e6' },
      
      // Documentos Word
      'doc': { icon: 'fe-file-text', color: '#2b579a', bg: '#e3f2fd' },
      'docx': { icon: 'fe-file-text', color: '#2b579a', bg: '#e3f2fd' },
      
      // Hojas de cálculo
      'xls': { icon: 'fe-grid', color: '#217346', bg: '#e8f5e9' },
      'xlsx': { icon: 'fe-grid', color: '#217346', bg: '#e8f5e9' },
      'csv': { icon: 'fe-grid', color: '#217346', bg: '#e8f5e9' },
      
      // Imágenes
      'jpg': { icon: 'fe-image', color: '#9c27b0', bg: '#f3e5f5' },
      'jpeg': { icon: 'fe-image', color: '#9c27b0', bg: '#f3e5f5' },
      'png': { icon: 'fe-image', color: '#9c27b0', bg: '#f3e5f5' },
      'gif': { icon: 'fe-image', color: '#9c27b0', bg: '#f3e5f5' },
      'svg': { icon: 'fe-image', color: '#9c27b0', bg: '#f3e5f5' },
      
      // Presentaciones
      'ppt': { icon: 'fe-monitor', color: '#d24726', bg: '#ffebee' },
      'pptx': { icon: 'fe-monitor', color: '#d24726', bg: '#ffebee' },
      
      // Otros
      'txt': { icon: 'fe-file', color: '#607d8b', bg: '#eceff1' },
      'zip': { icon: 'fe-archive', color: '#ff9800', bg: '#fff3e0' },
      'rar': { icon: 'fe-archive', color: '#ff9800', bg: '#fff3e0' },
    };

    return icons[type] || { icon: 'fe-file', color: '#757575', bg: '#f5f5f5' };
  };

  const checkUserRole = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      
      if (!user) {
        setUserLevel(null);
        return;
      }

      const { data: sys, error } = await supabase
        .from('system_users')
        .select('role_id, roles (level, role_name)')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error obteniendo rol:', error);
        setUserLevel(null);
        return;
      }

      const level = sys?.roles?.level;
      const roleName = sys?.roles?.role_name;
      
      setUserRole(roleName);
      setUserLevel(level);

      // Si es Gestor (level 2), obtener sus filiales
      if (level === 2) {
        const { data: managerBranches } = await supabase
          .from('branch_managers')
          .select('branch_id')
          .eq('user_id', user.id);
        
        if (managerBranches) {
          setUserBranches(managerBranches.map(bm => bm.branch_id));
        }
      }
    } catch (e) {
      console.error('Error verificando rol:', e);
    }
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

  const loadDocumentos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          document_id,
          file_name,
          file_type,
          file_url,
          description,
          created_at,
          branch_id,
          annex_id,
          branches (branch_id, name),
          annexes (annex_id, name),
          members:uploaded_by (
            member_id,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error cargando documentos:', error);
        showToast('Error al cargar la lista de documentos', 'danger');
        return;
      }

      let filteredData = data || [];

      // Filtrar por filial si viene parámetro id o si es Gestor
      if (id) {
        console.log('🔍 Filtrando documentos por filial (URL):', id);
        filteredData = filteredData.filter(doc => doc.branches?.branch_id === id);
      } else if (userLevel === 2 && userBranches.length > 0) {
        console.log('🔍 Filtrando documentos por filiales del gestor');
        filteredData = filteredData.filter(doc => 
          userBranches.includes(doc.branches?.branch_id)
        );
      }

      console.log('✅ Documentos cargados:', filteredData.length);
      setDocumentos(filteredData);
    } catch (err) {
      console.error('Error inesperado:', err);
      showToast('Error inesperado al cargar documentos', 'danger');
    } finally {
      setLoading(false);
    }
  }, [id, userLevel, userBranches]);

  // Cargar datos iniciales
  useEffect(() => {
    if (router.isReady) {
      checkUserRole();
      if (id) {
        loadBranchInfo();
      }
    }
  }, [router.isReady, id, loadBranchInfo]);

  useEffect(() => {
    if (userLevel !== null) {
      loadDocumentos();
    }
  }, [userLevel, loadDocumentos]);

  // Filtrar documentos por búsqueda
  const documentosFiltrados = documentos.filter(doc => {
    const texto = `${doc.file_name} ${doc.description || ''} ${doc.branches?.name || ''} ${doc.annexes?.name || ''} ${doc.members?.first_name || ''} ${doc.members?.last_name || ''}`.toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  return (
    <>
      {/* Toast para mensajes */}
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
        {/* Header */}
        <Card className="mb-4 shadow-sm border-0" style={{ background: "#f8fafc" }}>
          <Card.Body className="d-flex flex-column flex-md-row align-items-center justify-content-between" style={{ background: "#e3e7ed" }}>
            <div>
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <h2 className="mb-0" style={{ color: "#2a4365", fontWeight: 700 }}>
                  Gestión de Documentos
                </h2>
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
                        router.push('/pages/documentos', undefined, { shallow: true });
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
                  ? `Documentos de la filial ${branchFilter.name}`
                  : userLevel === 2 
                    ? 'Documentos de tus filiales asignadas'
                    : 'Consulta y gestiona los documentos de todas las filiales'
                }
              </p>
            </div>
            <div className="d-flex gap-2 mt-3 mt-md-0 flex-wrap">
              <Form style={{ minWidth: 260 }}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Buscar documentos..."
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                    style={{ borderRadius: "20px" }}
                  />
                </InputGroup>
              </Form>
              <Button variant="primary" style={{ whiteSpace: 'nowrap' }}>
                <i className="fe fe-upload me-2"></i>
                Subir Documento
              </Button>
            </div>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
            <p className="mt-3">Cargando documentos...</p>
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {documentosFiltrados.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fe fe-folder" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
                  <p className="mt-3 text-muted">No hay documentos disponibles</p>
                  {!filtro && (
                    <Button variant="primary" className="mt-2">
                      <i className="fe fe-upload me-2"></i>
                      Subir primer documento
                    </Button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th className="border-0 py-3" style={{ width: '50px' }}>Tipo</th>
                        <th className="border-0 py-3">Nombre del Archivo</th>
                        <th className="border-0 py-3">Propietario</th>
                        <th className="border-0 py-3">Filial / Anexo</th>
                        <th className="border-0 py-3">Tamaño</th>
                        <th className="border-0 py-3">Fecha de Creación</th>
                        <th className="border-0 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentosFiltrados.map((doc) => {
                        const iconInfo = getFileIcon(doc.file_type);
                        
                        return (
                          <tr key={doc.document_id}>
                            {/* Icono de tipo */}
                            <td className="align-middle">
                              <div 
                                className="d-flex align-items-center justify-content-center rounded"
                                style={{ 
                                  width: '40px', 
                                  height: '40px',
                                  background: iconInfo.bg
                                }}
                              >
                                <i 
                                  className={`fe ${iconInfo.icon}`} 
                                  style={{ 
                                    fontSize: '1.5rem',
                                    color: iconInfo.color
                                  }}
                                ></i>
                              </div>
                            </td>

                            {/* Nombre del archivo */}
                            <td className="align-middle">
                              <div>
                                <div className="fw-semibold text-dark">{doc.file_name}</div>
                                {doc.description && (
                                  <small className="text-muted">{doc.description}</small>
                                )}
                              </div>
                            </td>

                            {/* Propietario */}
                            <td className="align-middle">
                              <div className="d-flex align-items-center">
                                <div className="avatar avatar-sm me-2">
                                  <div className="avatar-title bg-light rounded-circle text-dark">
                                    {doc.members?.first_name?.charAt(0)}{doc.members?.last_name?.charAt(0)}
                                  </div>
                                </div>
                                <div>
                                  <small className="fw-semibold">
                                    {doc.members?.first_name} {doc.members?.last_name}
                                  </small>
                                </div>
                              </div>
                            </td>

                            {/* Filial / Anexo */}
                            <td className="align-middle">
                              <div>
                                <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                  {doc.branches?.name || '-'}
                                </div>
                                {doc.annexes?.name && (
                                  <small className="text-muted">
                                    <i className="fe fe-map-pin me-1"></i>
                                    {doc.annexes.name}
                                  </small>
                                )}
                              </div>
                            </td>

                            {/* Tamaño */}
                            <td className="align-middle">
                              <small className="text-muted">
                                {formatFileSize(doc.file_size)}
                              </small>
                            </td>

                            {/* Fecha */}
                            <td className="align-middle">
                              <small className="text-muted">
                                {formatDate(doc.created_at)}
                              </small>
                            </td>

                            {/* Acciones */}
                            <td className="align-middle text-center">
                              <Dropdown>
                                <Dropdown.Toggle 
                                  variant="light" 
                                  size="sm" 
                                  id={`dropdown-${doc.document_id}`}
                                  className="btn-icon"
                                >
                                  <i className="fe fe-more-vertical"></i>
                                </Dropdown.Toggle>

                                <Dropdown.Menu align="end">
                                  <Dropdown.Item 
                                    href={doc.file_url} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <i className="fe fe-eye me-2"></i>
                                    Ver
                                  </Dropdown.Item>
                                  <Dropdown.Item 
                                    href={doc.file_url} 
                                    download
                                  >
                                    <i className="fe fe-download me-2"></i>
                                    Descargar
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item className="text-danger">
                                    <i className="fe fe-trash-2 me-2"></i>
                                    Eliminar
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
            
            {/* Footer con total */}
            {documentosFiltrados.length > 0 && (
              <Card.Footer className="bg-light border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Mostrando {documentosFiltrados.length} documento{documentosFiltrados.length !== 1 ? 's' : ''}
                    {filtro && ` de ${documentos.length} total${documentos.length !== 1 ? 'es' : ''}`}
                  </small>
                </div>
              </Card.Footer>
            )}
          </Card>
        )}
      </Container>
    </>
  );
};

export default Documentos;
