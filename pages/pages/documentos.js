import { Container, Row, Col, Card, Table, Badge, Spinner, Toast, Form, Button, Modal } from 'react-bootstrap';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { InputGroup } from 'react-bootstrap';
import { Upload, Download, Trash } from 'react-bootstrap-icons';
import { useDropzone } from 'react-dropzone';
import { supabase } from 'lib/supabaseClient';
import Link from 'next/link';
import { useActiveBranch } from 'context/ActiveBranchContext';
import { logAudit } from 'lib/auditLog';

const Documentos = () => {
  const router = useRouter();
  const { id } = router.query; // ID de la filial desde URL (opcional)
  const { activeBranchId, clearActiveBranch } = useActiveBranch();
  const effectiveId = useMemo(() => id || activeBranchId || null, [id, activeBranchId]);
  
  const [filtro, setFiltro] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });
  const [userRole, setUserRole] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [userBranches, setUserBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null); // Estado para indicar descarga en progreso
  const [deletingId, setDeletingId] = useState(null); // Estado para indicar eliminación en progreso
  
  // Estados para modal de subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFormData, setUploadFormData] = useState({
    branch_id: '',
    annex_id: '',
    description: ''
  });
  const [branches, setBranches] = useState([]);
  const [annexes, setAnnexes] = useState([]);
  const [categories, setCategories] = useState([]);

  const showToast = (message, variant = 'info') => {
    setToast({ show: true, message, variant });
  };

  // Cargar categorías de documentos
  const loadDocumentCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
      console.log('📁 Categorías cargadas:', data);
    } catch (e) {
      console.error('Error cargando categorías:', e);
    }
  }, []);

  // Configuración de dropzone
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.odt', '.xlsx', '.csv', '.ods', '.jpg', '.jpeg', '.png', '.pptx'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.oasis.opendocument.text': ['.odt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          showToast('El archivo excede el tamaño máximo de 10MB', 'danger');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          showToast(`Tipo de archivo no permitido. Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}`, 'danger');
        } else {
          showToast('Error al seleccionar archivo', 'danger');
        }
        return;
      }
      if (acceptedFiles.length > 0) {
        setUploadFile(acceptedFiles[0]);
      }
    },
  });

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

  const loadDocumentos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          branches:branch_id (branch_id, name),
          annexes:annex_id (annex_id, name),
          document_categories:category_id (category_id, name, icon)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error cargando documentos:', error);
        showToast('Error al cargar la lista de documentos', 'danger');
        return;
      }

      let filteredData = data || [];

      // Filtrar por filial si viene parámetro id, contexto activo o si es Gestor
      if (id) {
        console.log('🔍 Filtrando documentos por filial (URL):', id);
        filteredData = filteredData.filter(doc => doc.branches?.branch_id === id);
      } else if (activeBranchId) {
        console.log('🔍 Filtrando documentos por filial (contexto):', activeBranchId);
        filteredData = filteredData.filter(doc => doc.branches?.branch_id === activeBranchId);
      } else if (userLevel === 2 && userBranches.length > 0) {
        console.log('🔍 Filtrando documentos por filiales del gestor');
        filteredData = filteredData.filter(doc => 
          userBranches.includes(doc.branches?.branch_id)
        );
      }

      console.log('✅ Documentos cargados:', filteredData.length);
      console.log('📦 Primer documento (debug):', filteredData[0]);
      setDocumentos(filteredData);
    } catch (err) {
      console.error('Error inesperado:', err);
      showToast('Error inesperado al cargar documentos', 'danger');
    } finally {
      setLoading(false);
    }
  }, [id, activeBranchId, userLevel, userBranches]);

  // Cargar datos iniciales
  useEffect(() => {
    if (router.isReady) {
      checkUserRole();
      loadBranches();
      loadDocumentCategories();
      if (effectiveId) {
        loadBranchInfo(effectiveId);
      } else {
        setBranchFilter(null);
      }
    }
  }, [router.isReady, effectiveId, loadBranchInfo, loadDocumentCategories]);

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
    }
  };

  const loadAnnexes = async (branchId) => {
    if (!branchId) {
      setAnnexes([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('annexes')
        .select('annex_id, name, is_headquarters')
        .eq('branch_id', branchId)
        .order('name');
      
      if (error) throw error;
      setAnnexes(data || []);
    } catch (e) {
      console.error('Error cargando anexos:', e);
      setAnnexes([]);
    }
  };

  const handleOpenUploadModal = () => {
    setUploadFile(null);
    setUploadFormData({
      branch_id: effectiveId || '',
      annex_id: '',
      description: '',
      category_id: ''
    });
    if (effectiveId) {
      loadAnnexes(effectiveId);
    }
    setShowUploadModal(true);
  };

  const handleUploadFormChange = (e) => {
    const { name, value } = e.target;
    setUploadFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'branch_id') {
      loadAnnexes(value);
      setUploadFormData(prev => ({ ...prev, annex_id: '' }));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      showToast('Por favor selecciona un archivo', 'warning');
      return;
    }
    if (!uploadFormData.branch_id) {
      showToast('Por favor selecciona una filial', 'warning');
      return;
    }
    if (!uploadFormData.category_id) {
      showToast('Por favor selecciona una categoría', 'warning');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'danger');
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('branchId', uploadFormData.branch_id);
      if (uploadFormData.annex_id) {
        formData.append('annexId', uploadFormData.annex_id);
      }
      if (uploadFormData.description) {
        formData.append('description', uploadFormData.description);
      }
      formData.append('categoryId', uploadFormData.category_id);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error subiendo documento');
      }

      // Registrar en auditoría
      try {
        console.log('📝 Registrando auditoría de documento:', result.document?.document_id);
        await logAudit({
          entityType: 'documentos',
          entityId: result.document?.document_id,
          action: 'CREATE',
          newValues: {
            file_name: uploadFile.name,
            category_id: uploadFormData.category_id,
            description: uploadFormData.description,
            branch_id: uploadFormData.branch_id,
            annex_id: uploadFormData.annex_id
          },
          description: `Documento subido: ${uploadFile.name}`,
          branchId: uploadFormData.branch_id,
          annexId: uploadFormData.annex_id || null,
          sendEmail: true
        });
        console.log('✅ Auditoría registrada correctamente');
      } catch (auditError) {
        console.error('❌ Error registrando auditoría:', auditError);
        // No fallar la subida si falla la auditoría
      }

      showToast('Documento subido exitosamente', 'success');
      setShowUploadModal(false);
      loadDocumentos();
    } catch (error) {
      console.error('Error:', error);
      showToast(error.message || 'Error al subir documento', 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      setDownloadingId(documentId); // Marcar como descargando
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'danger');
        setDownloadingId(null);
        return;
      }

      const response = await fetch(`/api/documents/download?documentId=${documentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error descargando documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Documento descargado exitosamente', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast(error.message || 'Error al descargar documento', 'danger');
    } finally {
      setDownloadingId(null); // Desmarcar descarga
    }
  };

  const handleDelete = async (documentId, fileName) => {
    if (!confirm(`¿Seguro que deseas eliminar "${fileName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setDeletingId(documentId); // Marcar como eliminando
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/documents/delete?documentId=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar documento');
      }

      // Registrar en auditoría
      try {
        console.log('📝 Registrando auditoría de eliminación:', documentId);
        await logAudit({
          entityType: 'documentos',
          entityId: documentId,
          action: 'DELETE',
          oldValues: { file_name: fileName },
          description: `Documento eliminado: ${fileName}`,
          sendEmail: true
        });
        console.log('✅ Auditoría de eliminación registrada');
      } catch (auditError) {
        console.error('❌ Error registrando auditoría de eliminación:', auditError);
        // No fallar la eliminación si falla la auditoría
      }

      showToast('Documento eliminado exitosamente', 'success');
      loadDocumentos();
    } catch (error) {
      console.error('Error:', error);
      showToast(error.message || 'Error al eliminar documento', 'danger');
    } finally {
      setDeletingId(null); // Desmarcar eliminación
    }
  };

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
                        if (id) {
                          router.push('/pages/documentos', undefined, { shallow: true });
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
              <Button variant="primary" style={{ whiteSpace: 'nowrap' }} onClick={handleOpenUploadModal}>
                <Upload className="me-2" size={16} />
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
                    <Button variant="primary" className="mt-2" onClick={handleOpenUploadModal}>
                      <Upload className="me-2" size={16} />
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
                        <th className="border-0 py-3">Categoría</th>
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
                                <div 
                                  className="fw-semibold" 
                                  style={{ 
                                    cursor: downloadingId === doc.document_id ? 'wait' : 'pointer',
                                    color: downloadingId === doc.document_id ? '#6c757d' : '#0d6efd'
                                  }}
                                  onClick={() => downloadingId === doc.document_id ? null : handleDownload(doc.document_id, doc.file_name)}
                                >
                                  {downloadingId === doc.document_id ? (
                                    <>
                                      <Spinner animation="border" size="sm" className="me-2" />
                                      Descargando...
                                    </>
                                  ) : (
                                    <>
                                      <Download size={14} className="me-1" />
                                      {doc.file_name}
                                    </>
                                  )}
                                </div>
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

                            {/* Categoría */}
                            <td className="align-middle">
                              {doc.document_categories ? (
                                <div className="d-flex align-items-center gap-2">
                                  <div 
                                    className="d-flex align-items-center justify-content-center rounded"
                                    style={{ 
                                      width: '32px', 
                                      height: '32px',
                                      background: '#f0f0f0'
                                    }}
                                  >
                                    <i 
                                      className={`fe ${doc.document_categories.icon || 'fe-folder'}`} 
                                      style={{ 
                                        fontSize: '1rem',
                                        color: '#4a5568'
                                      }}
                                      title={doc.document_categories.icon ? `Icon: ${doc.document_categories.icon}` : 'Sin icono'}
                                    ></i>
                                  </div>
                                  <small className="fw-semibold">{doc.document_categories.name || 'Sin nombre'}</small>
                                </div>
                              ) : (
                                <small className="text-muted">
                                  <i className="fe fe-minus-circle me-1" style={{ opacity: 0.5 }}></i>
                                  Sin categoría
                                </small>
                              )}
                            </td>

                            {/* Fecha */}
                            <td className="align-middle">
                              <small className="text-muted">
                                {formatDate(doc.created_at)}
                              </small>
                            </td>

                            {/* Acciones */}
                            <td className="align-middle text-center">
                              {deletingId === doc.document_id ? (
                                <Spinner animation="border" size="sm" variant="danger" />
                              ) : (
                                <Button
                                  variant="link"
                                  className="text-danger p-1"
                                  onClick={() => handleDelete(doc.document_id, doc.file_name)}
                                  title="Eliminar documento"
                                  style={{ lineHeight: 1 }}
                                >
                                  <Trash size={20} />
                                </Button>
                              )}
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

        {/* Modal de subida de documentos */}
        <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Subir Documento</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={12} className="mb-3">
                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    style={{
                      border: '2px dashed #cbd5e0',
                      borderRadius: '8px',
                      padding: '40px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragActive ? '#f7fafc' : uploadFile ? '#f0fff4' : '#fff',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input {...getInputProps()} />
                    {uploadFile ? (
                      <div>
                        <i className="fe fe-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-3 mb-0 fw-semibold">{uploadFile.name}</p>
                        <small className="text-muted">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </small>
                        <p className="mt-2 mb-0">
                          <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                            Cambiar archivo
                          </Button>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={48} className="text-muted mb-3" />
                        <p className="mb-2">
                          {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
                        </p>
                        <small className="text-muted">
                          Formatos permitidos: PDF, DOCX, ODT, XLSX, CSV, ODS, JPG, PNG, PPTX
                          <br />
                          Tamaño máximo: 10 MB
                        </small>
                      </div>
                    )}
                  </div>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Filial <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      name="branch_id"
                      value={uploadFormData.branch_id}
                      onChange={handleUploadFormChange}
                      disabled={!!effectiveId}
                    >
                      <option value="">Seleccionar filial...</option>
                      {branches.map(branch => (
                        <option key={branch.branch_id} value={branch.branch_id}>
                          {branch.name}
                        </option>
                      ))}
                    </Form.Select>
                    {effectiveId && (
                      <Form.Text className="text-muted">
                        Filial pre-seleccionada desde el filtro actual
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Anexo (Opcional)</Form.Label>
                    <Form.Select
                      name="annex_id"
                      value={uploadFormData.annex_id}
                      onChange={handleUploadFormChange}
                      disabled={!uploadFormData.branch_id}
                    >
                      <option value="">Todas los anexos</option>
                      {annexes.map(annex => (
                        <option key={annex.annex_id} value={annex.annex_id}>
                          {annex.name} {annex.is_headquarters ? '(Sede Principal)' : ''}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Si no seleccionas anexo, el documento será visible para toda la filial
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={12} className="mb-3">
                  <Form.Group>
                    <Form.Label>Descripción (Opcional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={uploadFormData.description}
                      onChange={handleUploadFormChange}
                      placeholder="Descripción breve del documento..."
                      maxLength={500}
                    />
                  </Form.Group>
                </Col>

                <Col md={12} className="mb-3">
                  <Form.Group>
                    <Form.Label>Categoría <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      name="category_id"
                      value={uploadFormData.category_id}
                      onChange={handleUploadFormChange}
                    >
                      <option value="">Seleccionar categoría...</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Selecciona la categoría que mejor describe este documento
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUpload} disabled={uploading || !uploadFile}>
              {uploading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={16} className="me-2" />
                  Subir Documento
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default Documentos;
