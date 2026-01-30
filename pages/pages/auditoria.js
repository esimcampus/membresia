import { Container, Row, Col, Card, Table, Badge, Form, Button, Spinner, Pagination, Alert } from 'react-bootstrap';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ChevronDown, ChevronUp } from 'react-bootstrap-icons';
import { supabase } from 'lib/supabaseClient';
import { getAuditLogs, getAuditDetail } from 'lib/auditLog';
import { useActiveBranch } from 'context/ActiveBranchContext';

const Auditoria = () => {
  const router = useRouter();
  const { activeBranchId } = useActiveBranch();

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [userLevel, setUserLevel] = useState(null);
  const [userBranches, setUserBranches] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Filtros
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [daysBack, setDaysBack] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  // Expandir detalles
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);

  const entityTypes = [
    { value: 'miembros', label: 'Miembros' },
    { value: 'documentos', label: 'Documentos' },
    { value: 'calendario', label: 'Calendario' },
    { value: 'filiales', label: 'Filiales' },
    { value: 'anexos', label: 'Anexos' },
    { value: 'zonas', label: 'Zonas' }
  ];

  const actions = [
    { value: 'CREATE', label: '✨ Creado', color: 'success' },
    { value: 'UPDATE', label: '✏️ Modificado', color: 'warning' },
    { value: 'DELETE', label: '🗑️ Eliminado', color: 'danger' }
  ];

  // Verificar rol y permisos
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAccessDenied(true);
          return;
        }

        const { data: systemUser, error: userError } = await supabase
          .from('system_users')
          .select('role_id')
          .eq('user_id', user.id)
          .single();

        if (!systemUser || systemUser.role_id > 2) {
          setAccessDenied(true);
          return;
        }
        setUserLevel(systemUser.role_id);

        // Si es Gestor (role_id 2), obtener sus filiales asignadas
        if (systemUser.role_id === 2) {
          const { data: managerBranches } = await supabase
            .from('branch_managers')
            .select('branch_id')
            .eq('user_id', user.id);
          
          setUserBranches(managerBranches?.map(bm => bm.branch_id) || []);
          
          // Para Gestores, pre-seleccionar su primera filial
          if (managerBranches && managerBranches.length > 0) {
            setSelectedBranch(managerBranches[0].branch_id);
          }
        }
      } catch (e) {
        console.error('Error verificando permisos:', e);
        setAccessDenied(true);
      }
    };
    checkPermissions();
  }, []);

  // Cargar branches
  useEffect(() => {
    const loadBranches = async () => {
      try {
        let query = supabase
          .from('branches')
          .select('branch_id, name')
          .order('name');

        // Si es Gestor, filtrar solo sus filiales asignadas
        if (userLevel === 2 && userBranches.length > 0) {
          query = query.in('branch_id', userBranches);
        }

        const { data } = await query;
        setBranches(data || []);
      } catch (e) {
        console.error('Error cargando filiales:', e);
      }
    };
    if (userLevel !== null) {
      loadBranches();
    }
  }, [userLevel, userBranches]);

  // Cargar logs de auditoría
  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * recordsPerPage;
      const { data, count, error } = await getAuditLogs({
        branchId: selectedBranch || null,
        entityType: selectedEntity || null,
        action: selectedAction || null,
        daysBack: parseInt(daysBack),
        limit: recordsPerPage,
        offset: offset
      });

      let filtered = data || [];

      // Filtro de búsqueda adicional
      if (searchTerm) {
        filtered = filtered.filter(log =>
          log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setAuditLogs(filtered);
      setTotalRecords(count || 0);
      setApiError(error || null);
    } catch (e) {
      console.error('Error cargando auditoría:', e);
      setApiError({ status: 500, message: e?.message || 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedBranch, selectedEntity, selectedAction, daysBack, searchTerm]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Cargar detalles expandibles
  const handleExpandRow = async (auditId) => {
    if (expandedRow === auditId) {
      setExpandedRow(null);
      setExpandedDetail(null);
      return;
    }

    try {
      const detail = await getAuditDetail(auditId);
      setExpandedRow(auditId);
      setExpandedDetail(detail);
    } catch (e) {
      console.error('Error cargando detalles:', e);
    }
  };

  const getActionBadge = (action) => {
    const actionObj = actions.find(a => a.value === action);
    return <Badge bg={actionObj?.color}>{actionObj?.label}</Badge>;
  };

  const getEntityLabel = (entityType) => {
    const entity = entityTypes.find(e => e.value === entityType);
    return entity?.label || entityType;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  // Acceso denegado
  if (accessDenied) {
    return (
      <Container fluid className="p-6">
        <Alert variant="danger" className="mt-5">
          <h4>Acceso Denegado</h4>
          <p>No tienes permisos para acceder al registro de auditoría. Solo Administradores y Gestores pueden ver esta sección.</p>
        </Alert>
      </Container>
    );
  }

  // Loading
  if (userLevel === null) {
    return (
      <Container fluid className="p-6">
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Cargando...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container fluid className="p-6">
        {/* Header */}
        <Card className="mb-4 shadow-sm border-0" style={{ background: '#f8fafc' }}>
          <Card.Body>
            <div className="d-flex align-items-center gap-2 mb-3">
              <h2 className="mb-0" style={{ color: '#2a4365', fontWeight: 700 }}>
                Registro de Auditoría
              </h2>
              <Badge bg="info">{totalRecords} registros</Badge>
              {userLevel === 2 && (
                <Badge bg="warning" text="dark">
                  <i className="fe fe-lock me-1"></i>
                  Vista limitada a tu filial
                </Badge>
              )}
            </div>
            <p className="mb-0" style={{ color: '#4a5568' }}>
              Visualiza todos los cambios realizados en el sistema
            </p>
          </Card.Body>
        </Card>

        {/* Filtros */}
        <Card className="mb-4 shadow-sm border-0">
          <Card.Body>
            <h5 className="mb-3">Filtros</h5>
            <Row>
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Filial
                    {userLevel === 2 && <small className="text-muted"> (tu filial)</small>}
                  </Form.Label>
                  <Form.Select
                    value={selectedBranch}
                    onChange={(e) => {
                      // Para Gestores, solo permitir su filial
                      if (userLevel === 2 && userBranches.length > 0 && !userBranches.includes(e.target.value) && e.target.value !== '') {
                        return;
                      }
                      setSelectedBranch(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={userLevel === 2 && userBranches.length === 1}
                  >
                    {userLevel === 1 && <option value="">Todas</option>}
                    {branches.map(branch => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.name}
                      </option>
                    ))}
                  </Form.Select>
                  {userLevel === 2 && (
                    <Form.Text className="text-muted">
                      Como Gestor, solo puedes ver auditorías de tu filial asignada
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label className="fw-semibold">Tipo de Registro</Form.Label>
                  <Form.Select
                    value={selectedEntity}
                    onChange={(e) => {
                      setSelectedEntity(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Todos</option>
                    {entityTypes.map(entity => (
                      <option key={entity.value} value={entity.value}>
                        {entity.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={2} className="mb-3">
                <Form.Group>
                  <Form.Label className="fw-semibold">Acción</Form.Label>
                  <Form.Select
                    value={selectedAction}
                    onChange={(e) => {
                      setSelectedAction(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Todas</option>
                    {actions.map(action => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={2} className="mb-3">
                <Form.Group>
                  <Form.Label className="fw-semibold">Últimos días</Form.Label>
                  <Form.Select
                    value={daysBack}
                    onChange={(e) => {
                      setDaysBack(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="1">Hoy</option>
                    <option value="7">Última semana</option>
                    <option value="30">Último mes</option>
                    <option value="90">Últimos 3 meses</option>
                    <option value="365">Último año</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={2} className="mb-3">
                <Form.Group>
                  <Form.Label className="fw-semibold">Buscar</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Descripción..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {apiError && (
          <Alert variant="warning" className="mb-4">
            <strong>Error al cargar auditoría:</strong>{' '}
            {apiError.message || 'Error desconocido'}
          </Alert>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-3">Cargando auditoría...</p>
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {auditLogs.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fe fe-alert-circle" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                  <p className="mt-3 text-muted">No hay registros de auditoría</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th className="border-0 py-3" style={{ width: '40px' }}></th>
                        <th className="border-0 py-3">Acción</th>
                        <th className="border-0 py-3">Tipo</th>
                        <th className="border-0 py-3">Descripción</th>
                        <th className="border-0 py-3">Usuario</th>
                        <th className="border-0 py-3">Fecha</th>
                        <th className="border-0 py-3 text-center">Cambios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.audit_id} style={{ background: expandedRow === log.audit_id ? '#f0f4f8' : '' }}>
                          <td className="align-middle">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0"
                              onClick={() => handleExpandRow(log.audit_id)}
                            >
                              {expandedRow === log.audit_id ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </Button>
                          </td>
                          <td className="align-middle">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="align-middle">
                            <small className="fw-semibold">{getEntityLabel(log.entity_type)}</small>
                          </td>
                          <td className="align-middle">
                            <small>{log.description || '-'}</small>
                          </td>
                          <td className="align-middle">
                            <small className="text-muted">
                              {log.members
                                ? `${log.members.first_name} ${log.members.last_name}`
                                : 'Desconocido'
                              }
                            </small>
                          </td>
                          <td className="align-middle">
                            <small className="text-muted">{formatDate(log.created_at)}</small>
                          </td>
                          <td className="align-middle text-center">
                            <Badge bg="light" text="dark">{log.changes_count}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Detalles expandidos */}
              {expandedRow && expandedDetail && (
                <div style={{ padding: '20px', background: '#f3f4f6', borderTop: '1px solid #e5e7eb' }}>
                  <h6 className="mb-3">Detalles del Cambio</h6>
                  <Row>
                    {expandedDetail.old_values && Object.keys(expandedDetail.old_values).length > 0 && (
                      <Col md={6} className="mb-3">
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <small className="fw-semibold d-block mb-2">Valores Anteriores:</small>
                          <pre style={{ fontSize: '12px', maxHeight: '300px', overflow: 'auto', margin: 0 }}>
                            {JSON.stringify(expandedDetail.old_values, null, 2)}
                          </pre>
                        </div>
                      </Col>
                    )}
                    {expandedDetail.new_values && Object.keys(expandedDetail.new_values).length > 0 && (
                      <Col md={6} className="mb-3">
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <small className="fw-semibold d-block mb-2">Valores Nuevos:</small>
                          <pre style={{ fontSize: '12px', maxHeight: '300px', overflow: 'auto', margin: 0 }}>
                            {JSON.stringify(expandedDetail.new_values, null, 2)}
                          </pre>
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <Pagination className="mb-0 justify-content-center">
                    <Pagination.First
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    />
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={currentPage === pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                  <div className="text-center mt-2">
                    <small className="text-muted">
                      Página {currentPage} de {totalPages} ({totalRecords} total)
                    </small>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
};

export default Auditoria;
