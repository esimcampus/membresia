// import node module libraries
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { Trash } from 'react-bootstrap-icons';
import { supabase } from 'lib/supabaseClient';
import { logAudit } from 'lib/auditLog';

const EventModal = ({ show, onHide, eventData, branches, userLevel, userBranches, onSave, showToast }) => {
    console.log('EventModal Props:', { 
        show, 
        eventData, 
        branches: branches?.length || 0,
        branchesData: branches,
        userLevel,
        userBranches 
    });
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        branch_id: '',
        annex_id: ''
    });
    const [annexes, setAnnexes] = useState([]);
    const [loading, setLoading] = useState(false);
    const isManager = userLevel === 2;
    const managerBranchId = isManager && userBranches && userBranches.length > 0 ? userBranches[0] : '';

    useEffect(() => {
        if (eventData) {
            const preselectedBranchId = eventData.branch_id || (isManager && managerBranchId ? managerBranchId : '');

            // Modo edición o creación con fecha pre-seleccionada
            setFormData({
                name: eventData.name || '',
                description: eventData.description || '',
                event_date: eventData.event_date || '',
                start_time: eventData.start_time || '',
                end_time: eventData.end_time || '',
                branch_id: preselectedBranchId,
                annex_id: eventData.annex_id || ''
            });
            if (preselectedBranchId) {
                loadAnnexes(preselectedBranchId);
            }
        } else {
            // Modo creación sin datos
            resetForm();
        }
    }, [eventData, show, isManager, managerBranchId]);

    useEffect(() => {
        // Si es creación (no edición) y es Gestor, asegurar filial y anexos
        const isEditing = Boolean(eventData?.event_id);
        if (!show || isEditing) return;
        if (isManager && managerBranchId) {
            if (!formData.branch_id) {
                setFormData(prev => ({ ...prev, branch_id: managerBranchId, annex_id: '' }));
            }
            loadAnnexes(managerBranchId);
        }
    }, [show, eventData, isManager, managerBranchId, formData.branch_id]);

    const resetForm = () => {
        const newFormData = {
            name: '',
            description: '',
            event_date: '',
            start_time: '',
            end_time: '',
            // Auto-seleccionar filial del Gestor (usa la primera asignada)
            branch_id: (userLevel === 2 && userBranches && userBranches.length > 0) ? userBranches[0] : '',
            annex_id: ''
        };
        setFormData(newFormData);
        
        // Si el Gestor tiene filial asignada, cargar sus anexos automáticamente
        if (userLevel === 2 && userBranches && userBranches.length > 0) {
            loadAnnexes(userBranches[0]);
            console.log('✅ Gestor: Filial y anexos auto-seleccionados');
        } else {
            setAnnexes([]);
        }
    };

    const loadAnnexes = async (branchId) => {
        if (!branchId) {
            setAnnexes([]);
            return;
        }
        
        try {
            console.log('Cargando anexos para branch_id:', branchId);
            const { data, error } = await supabase
                .from('annexes')
                .select('annex_id, name, is_headquarters')
                .eq('branch_id', branchId)
                .order('name');

            if (error) throw error;
            
            console.log('Anexos recibidos:', data);
            
            // Ordenar manualmente: sedes principales primero
            const sortedData = (data || []).sort((a, b) => {
                if (a.is_headquarters && !b.is_headquarters) return -1;
                if (!a.is_headquarters && b.is_headquarters) return 1;
                return 0;
            });
            
            console.log('Anexos ordenados:', sortedData);
            setAnnexes(sortedData);
        } catch (e) {
            console.error('Error cargando anexos:', e);
            setAnnexes([]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'branch_id') {
            loadAnnexes(value);
            setFormData(prev => ({ ...prev, annex_id: '' }));
        }
    };

    const checkDuplicateEvents = async () => {
        if (!formData.event_date || !formData.branch_id) return false;

        try {
            const { data, error } = await supabase
                .from('events')
                .select('event_id, name, start_time')
                .eq('branch_id', formData.branch_id)
                .eq('event_date', formData.event_date)
                .eq('is_active', true);

            if (error) throw error;

            // Si estamos editando, excluir el evento actual
            const otherEvents = eventData 
                ? data.filter(e => e.event_id !== eventData.event_id)
                : data;

            if (otherEvents.length > 0) {
                const eventsList = otherEvents.map(e => {
                    const time = e.start_time ? ` a las ${e.start_time.substring(0, 5)}` : '';
                    return `"${e.name}"${time}`;
                }).join(', ');
                
                const warningMessage = `⚠️ Ya existe${otherEvents.length > 1 ? 'n' : ''} ${otherEvents.length} evento${otherEvents.length > 1 ? 's' : ''} ` +
                    `en esta filial para esta fecha.`;
                
                if (showToast) {
                    showToast(warningMessage, 'warning');
                }
                return true;
            }
            
            return false;
        } catch (e) {
            console.error('Error verificando eventos:', e);
            return false;
        }
    };

    const handleSave = async () => {
        
        // Validaciones
        if (!formData.name.trim()) {
            if (showToast) showToast('El nombre del evento es requerido', 'danger');
            return;
        }
        if (!formData.event_date) {
            if (showToast) showToast('La fecha del evento es requerida', 'danger');
            return;
        }
        if (!formData.branch_id) {
            if (showToast) showToast('Debe seleccionar una filial', 'danger');
            return;
        }

        // Validar que los Gestores (level 2) solo creen eventos en sus filiales asignadas
        if (userLevel === 2 && userBranches && !userBranches.includes(formData.branch_id)) {
            if (showToast) showToast('Como Gestor solo puedes crear eventos en tu filial asignada', 'danger');
            console.warn('❌ Gestor intentando crear evento en filial no asignada:', { 
                branchId: formData.branch_id, 
                userBranches 
            });
            return;
        }

        if (formData.start_time && formData.end_time && formData.end_time < formData.start_time) {
            if (showToast) showToast('La hora de fin debe ser posterior a la hora de inicio', 'danger');
            return;
        }

        // Verificar duplicados
        await checkDuplicateEvents();

        try {
            setLoading(true);

            const eventPayload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                event_date: formData.event_date,
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                branch_id: formData.branch_id,
                annex_id: formData.annex_id && formData.annex_id !== '' ? formData.annex_id : null,
                is_active: true
            };

            if (eventData?.event_id) {
                // Actualizar evento existente
                const { error } = await supabase
                    .from('events')
                    .update(eventPayload)
                    .eq('event_id', eventData.event_id);

                if (error) throw error;

                await logAudit({
                    entityType: 'calendario',
                    entityId: eventData.event_id,
                    action: 'UPDATE',
                    oldValues: eventData,
                    newValues: eventPayload,
                    description: `Evento actualizado: ${eventPayload.name}`,
                    branchId: eventPayload.branch_id,
                    annexId: eventPayload.annex_id,
                    sendEmail: true
                });
            } else {
                // Crear nuevo evento
                const { data: { user } } = await supabase.auth.getUser();
                
                // Obtener member_id del usuario desde system_users
                const { data: systemUser, error: userError } = await supabase
                    .from('system_users')
                    .select('member_id')
                    .eq('user_id', user.id)
                    .single();
                
                if (userError || !systemUser?.member_id) {
                    throw new Error('No se pudo obtener la información del usuario');
                }
                
                eventPayload.created_by = systemUser.member_id;

                const { data: createdEvent, error } = await supabase
                    .from('events')
                    .insert([eventPayload])
                    .select()
                    .single();

                if (error) throw error;

                await logAudit({
                    entityType: 'calendario',
                    entityId: createdEvent?.event_id,
                    action: 'CREATE',
                    newValues: eventPayload,
                    description: `Evento creado: ${eventPayload.name}`,
                    branchId: eventPayload.branch_id,
                    annexId: eventPayload.annex_id,
                    sendEmail: true
                });
            }

            onSave();
            onHide();
            resetForm();
        } catch (e) {
            console.error('Error guardando evento:', e);
            if (showToast) showToast('Error al guardar el evento: ' + e.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onHide();
    };

    const handleDelete = async () => {
        if (!eventData?.event_id) return;
        const confirmMsg = `¿Seguro que deseas eliminar el evento "${eventData.name || ''}"? Esta acción no se puede deshacer.`;
        const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMsg) : false;
        if (!confirmed) return;

        try {
            setLoading(true);
            // Borrado lógico: marcar como inactivo
            const { error } = await supabase
                .from('events')
                .update({ is_active: false })
                .eq('event_id', eventData.event_id);

            if (error) throw error;

            await logAudit({
                entityType: 'calendario',
                entityId: eventData.event_id,
                action: 'DELETE',
                oldValues: eventData,
                description: `Evento eliminado: ${eventData.name || ''}`,
                branchId: eventData.branch_id,
                annexId: eventData.annex_id,
                sendEmail: true
            });
            if (showToast) showToast('Evento eliminado', 'success');
            onSave();
            onHide();
            resetForm();
        } catch (e) {
            console.error('Error eliminando evento:', e);
            if (showToast) showToast('Error al eliminar el evento: ' + e.message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {eventData?.event_id ? 'Editar Evento' : 'Nuevo Evento'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Row>
                        <Col md={12} className="mb-3">
                            <Form.Group>
                                <Form.Label>Nombre del Evento <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej: Reunión de líderes"
                                    maxLength={255}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={12} className="mb-3">
                            <Form.Group>
                                <Form.Label>Descripción</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Descripción del evento (opcional)"
                                />
                            </Form.Group>
                        </Col>

                        <Col md={4} className="mb-3">
                            <Form.Group>
                                <Form.Label>Fecha <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    name="event_date"
                                    value={formData.event_date}
                                    onChange={handleChange}
                                    onBlur={checkDuplicateEvents}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={4} className="mb-3">
                            <Form.Group>
                                <Form.Label>Hora Inicio</Form.Label>
                                <Form.Control
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={4} className="mb-3">
                            <Form.Group>
                                <Form.Label>Hora Fin</Form.Label>
                                <Form.Control
                                    type="time"
                                    name="end_time"
                                    value={formData.end_time}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Filial <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    name="branch_id"
                                    value={formData.branch_id}
                                    onChange={handleChange}
                                    onBlur={checkDuplicateEvents}
                                    disabled={userLevel === 2 && userBranches && userBranches.length > 0}
                                >
                                    <option value="">Seleccionar filial...</option>
                                    {console.log('Rendering branches in select:', branches, 'userLevel:', userLevel, 'userBranches:', userBranches)}
                                    {branches && branches.length > 0 ? (
                                        branches
                                            .filter(branch => {
                                                // Si es Gestor (level 2), mostrar solo sus filiales asignadas
                                                if (userLevel === 2 && userBranches && userBranches.length > 0) {
                                                    return userBranches.includes(branch.branch_id);
                                                }
                                                // Si es Admin, mostrar todas
                                                return true;
                                            })
                                            .map(branch => (
                                                <option key={branch.branch_id} value={branch.branch_id}>
                                                    {branch.name}
                                                </option>
                                            ))
                                    ) : (
                                        <option value="" disabled>No hay filiales disponibles</option>
                                    )}
                                </Form.Select>
                                {(!branches || branches.length === 0) && (
                                    <Form.Text className="text-danger">
                                        No se cargaron las filiales
                                    </Form.Text>
                                )}
                                {userLevel === 2 && userBranches && userBranches.length > 0 && (
                                    <Form.Text className="text-muted">
                                        Como Gestor, solo puedes crear eventos en tu filial asignada
                                    </Form.Text>
                                )}
                            </Form.Group>
                        </Col>

                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Anexo</Form.Label>
                                <Form.Select
                                    name="annex_id"
                                    value={formData.annex_id}
                                    onChange={handleChange}
                                    disabled={!formData.branch_id && !managerBranchId}
                                >
                                    <option value="">Toda la filial</option>
                                    {annexes.map(annex => (
                                        <option key={annex.annex_id} value={annex.annex_id}>
                                            {annex.name} {annex.is_headquarters ? '(Sede Principal)' : ''}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Opcional: seleccionar anexo específico
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                {eventData?.event_id && (
                    <Button variant="outline-danger" className="me-auto" onClick={handleDelete} disabled={loading}>
                        <Trash className="d-md-none" />
                        <span className="d-none d-md-inline">Eliminar</span>
                    </Button>
                )}
                <Button variant="outline-secondary" onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Guardando...' : (eventData?.event_id ? 'Actualizar' : 'Crear Evento')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EventModal;
