// import node module libraries
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useActiveBranch } from 'context/ActiveBranchContext';
import { useRouter } from 'next/router';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Card, Button, Form, Row, Col, Badge, Spinner, Toast } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import EventModal from 'sub-components/events/EventModal';

const Calendario = () => {
  const router = useRouter();
  const calendarRef = useRef(null);
  const { activeBranchId } = useActiveBranch();
  const [events, setEvents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [userBranches, setUserBranches] = useState([]); // Filiales del gestor
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });

  const showToast = (message, variant = 'info') => {
    setToast({ show: true, message, variant });
  };

  // Detectar parámetro id en URL; si no existe y hay contexto activo, usarlo
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.id) {
      const branchId = router.query.id;
      console.log('🔗 Branch ID detectado en URL (parámetro id):', branchId);
      setSelectedBranch(branchId);
    } else if (activeBranchId) {
      console.log('🔗 Usando filial activa del contexto en calendario:', activeBranchId);
      setSelectedBranch(activeBranchId);
    } else {
      setSelectedBranch('');
    }
  }, [router.isReady, router.query.id, activeBranchId]);

  const loadEvents = useCallback(async () => {
    try {
      let query = supabase
        .from('events')
        .select(`
          event_id,
          name,
          description,
          event_date,
          start_time,
          end_time,
          branch_id,
          annex_id,
          branches (name),
          annexes (name)
        `)
        .eq('is_active', true)
        .order('event_date')
        .order('start_time');

      // Filtrar por filial si está seleccionada
      if (selectedBranch) {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar datos para FullCalendar
      const transformedEvents = (data || []).map(event => {
        const startDateTime = event.start_time 
          ? `${event.event_date}T${event.start_time}`
          : event.event_date;
        
        const endDateTime = event.end_time 
          ? `${event.event_date}T${event.end_time}`
          : null;

        return {
          id: event.event_id,
          title: event.name,
          start: startDateTime,
          end: endDateTime,
          backgroundColor: '#3182ce',
          borderColor: '#3182ce',
          extendedProps: {
            description: event.description,
            branch: event.branches?.name,
            annex: event.annexes?.name,
            branch_id: event.branch_id,
            annex_id: event.annex_id,
            start_time: event.start_time,
            end_time: event.end_time,
            event_date: event.event_date
          }
        };
      });

      console.log('📅 Eventos transformados para FullCalendar:', transformedEvents.length, transformedEvents);
      setEvents(transformedEvents);
    } catch (e) {
      console.error('Error cargando eventos:', e);
      showToast('Error al cargar los eventos', 'danger');
    }
  }, [selectedBranch]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Iniciando loadInitialData...');
      
      // Verificar rol del usuario (igual que en lista-miembros)
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      
      console.log('👤 Usuario autenticado:', user?.id || 'No autenticado');
      
      let userManagedBranches = [];
      
      if (user) {
        const { data: sys, error: sysError } = await supabase
          .from('system_users')
          .select('role_id, roles (level, role_name)')
          .eq('user_id', user.id)
          .single();
        
        console.log('👔 System user query:', { sys, sysError });
        
        if (!sysError && sys) {
          const level = sys?.roles?.level;
          const roleName = sys?.roles?.role_name;
          
          console.log('📊 Rol detectado:', { level, roleName });
          
          setUserRole(roleName);
          setUserLevel(level);
          
          // Si es Gestor (level 2), obtener sus filiales asignadas
          if (level === 2) {
            const { data: managerBranches, error: branchErr } = await supabase
              .from('branch_managers')
              .select('branch_id')
              .eq('user_id', user.id);
            
            console.log('🏢 Branch managers query:', { managerBranches, branchErr });
            
            if (!branchErr && managerBranches) {
              userManagedBranches = managerBranches.map(bm => bm.branch_id);
              setUserBranches(userManagedBranches);
              console.log('✅ Filiales del gestor:', userManagedBranches);
            }
          }
        }
      }

      // Cargar filiales según el rol
      console.log('🔍 Preparando query de branches...');
      console.log('   userManagedBranches.length:', userManagedBranches.length);
      
      let branchQuery = supabase
        .from('branches')
        .select('branch_id, name')
        .order('name');
      
      // Si es Gestor, filtrar solo sus filiales
      if (userManagedBranches.length > 0) {
        console.log('   → Filtrando por filiales del gestor');
        branchQuery = branchQuery.in('branch_id', userManagedBranches);
      } else {
        console.log('   → Sin filtro (Admin o sin filiales asignadas)');
      }

      const { data: branchData, error: branchErr } = await branchQuery;

      console.log('🏢 Resultado query branches:', { 
        branchData, 
        branchErr,
        count: branchData?.length || 0 
      });

      if (branchErr) throw branchErr;
      setBranches(branchData || []);
      
      console.log('✅ setBranches ejecutado con:', branchData?.length || 0, 'filiales');

      await loadEvents();
    } catch (e) {
      console.error('❌ Error cargando datos iniciales:', e);
      showToast('Error al cargar los datos iniciales', 'danger');
    } finally {
      setLoading(false);
      console.log('✅ loadInitialData completado');
    }
  }, [loadEvents]);

  useEffect(() => {
    loadInitialData();
    
    // Configurar vista inicial según tamaño de pantalla
    const setInitialView = () => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi && window.innerWidth < 768) {
        calendarApi.changeView('listMonth');
      }
    };
    
    // Esperar un poco para que el calendario se monte
    setTimeout(setInitialView, 100);
  }, [loadInitialData]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    setSelectedEvent({
      event_id: event.id,
      name: event.title,
      description: event.extendedProps.description,
      event_date: event.extendedProps.event_date,
      start_time: event.extendedProps.start_time,
      end_time: event.extendedProps.end_time,
      branch_id: event.extendedProps.branch_id,
      annex_id: event.extendedProps.annex_id
    });
    setShowModal(true);
  };

  const handleDateClick = (arg) => {
    // Solo abrir modal si el usuario puede crear eventos
    if (canCreateEvent()) {
      console.log('Opening modal with branches:', branches);
      console.log('User level:', userLevel);
      console.log('User branches:', userBranches);
      // Pre-llenar la fecha del día clickeado
      setSelectedEvent({
        event_date: arg.dateStr // Formato: 'YYYY-MM-DD'
      });
      setShowModal(true);
    }
  };

  const handleSaveEvent = () => {
    loadEvents();
  };

  const canCreateEvent = () => {
    // Administradores (level 1) y Gestores (level 2) pueden crear eventos
    return userLevel === 1 || userLevel === 2;
  };

  const renderEventContent = (eventInfo) => {
    const hasTime = eventInfo.event.extendedProps.start_time;
    
    return (
      <div 
        className="p-1" 
        style={{ 
          cursor: 'pointer',
          fontSize: '0.85em',
          overflow: 'hidden'
        }}
      >
        <div className="fw-semibold text-truncate">
          {hasTime && (
            <span className="me-1">
              {eventInfo.event.extendedProps.start_time?.substring(0, 5)}
            </span>
          )}
          {eventInfo.event.title}
        </div>
        {eventInfo.event.extendedProps.annex && (
          <div className="text-truncate" style={{ fontSize: '0.9em', opacity: 0.9 }}>
            <i className="fe fe-map-pin me-1"></i>
            {eventInfo.event.extendedProps.annex}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <Card className="shadow-sm border-0">
          <Card.Body className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
            <p className="mt-3 mb-0 text-muted">Cargando calendario...</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

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

      <div className="container-fluid p-4">
        {/* Header con título */}
        <Row className="mb-3 align-items-center">
          <Col>
            <h2 className="mb-0">Calendario de Eventos</h2>
            
          </Col>
        </Row>

        <Card className="shadow-sm border-0">
        <Card.Body>
            {/* Filtro por filial */}
            <Row className="mb-3 align-items-center">
              <Col lg={4} md={6} sm={12}>
                <Form.Group className="mb-0">
                  <Form.Label className="fw-semibold mb-2">
                  <i className="fe fe-filter me-2"></i>
                  Filtrar por Filial
                </Form.Label>
                <Form.Select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="shadow-sm"
                >
                  <option value="">Todas las filiales</option>
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
              <Col lg={8} md={6} sm={12} className="mt-3 mt-md-0">
                <div className="d-flex gap-2 flex-wrap align-items-center justify-content-md-end">
                  <Badge bg="primary" className="px-3 py-2">
                    {events.length} evento{events.length !== 1 ? 's' : ''}
                  </Badge>
                  {selectedBranch && (
                    <>
                      <Badge bg="info" className="px-3 py-2">
                        <i className="fe fe-filter me-1"></i>
                        {branches.find(b => b.branch_id === selectedBranch)?.name}
                      </Badge>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedBranch('');
                          router.push('/pages/calendario', undefined, { shallow: true });
                        }}
                      >
                        <i className="fe fe-x me-1"></i>
                        Limpiar filtro
                      </Button>
                    </>
                  )}
                </div>
            </Col>
          </Row>

            {/* Información */}
            {canCreateEvent() && (
              <div className="mb-3 p-2 bg-light rounded">
                <small className="text-muted">
                  <i className="fe fe-info me-1"></i>
                  Haz clic en un evento para editarlo o en un día para crear uno nuevo.
                </small>
            </div>
            )}

          {/* Calendario */}
          <div className="calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locales={[esLocale]}
              locale="es"
              events={events}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              height="auto"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listMonth'
              }}
              views={{
                listMonth: {
                  buttonText: 'Lista',
                  listDayFormat: { weekday: 'long', day: 'numeric', month: 'long' }
                }
              }}
              noEventsContent="No hay eventos para mostrar en este período"
              buttonText={{
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                list: 'Lista'
              }}
              // Responsive: cambiar vista según tamaño de pantalla
              windowResize={(arg) => {
                const calendarApi = calendarRef.current?.getApi();
                if (calendarApi) {
                  if (window.innerWidth < 768) {
                    // En móvil, cambiar a vista de lista
                    calendarApi.changeView('listMonth');
                  } else {
                    // En desktop, volver a vista de mes
                    if (calendarApi.view.type === 'listMonth') {
                      calendarApi.changeView('dayGridMonth');
                    }
                  }
                }
              }}
              dayMaxEvents={3}
              moreLinkText={(num) => `+${num} más`}
              eventDisplay="block"
              displayEventTime={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Modal de evento */}
      <EventModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setSelectedEvent(null);
        }}
        eventData={selectedEvent}
        branches={branches}
        userLevel={userLevel}
        userBranches={userBranches}
        onSave={handleSaveEvent}
        showToast={showToast}
      />

      <style jsx global>{`
        .calendar-container {
          padding: 10px;
          background: white;
          border-radius: 8px;
        }

        .fc {
          font-family: inherit;
        }

        .fc .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #2d3748;
        }

        .fc .fc-button {
          background-color: #3182ce;
          border-color: #3182ce;
          text-transform: capitalize;
          font-weight: 500;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
        }

        .fc .fc-button:hover {
          background-color: #2c5aa0;
          border-color: #2c5aa0;
        }

        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background-color: #2c5aa0;
          border-color: #2c5aa0;
        }

        .fc .fc-button:focus {
          box-shadow: 0 0 0 0.2rem rgba(49, 130, 206, 0.25);
        }

        .fc .fc-daygrid-day {
          cursor: pointer;
        }

        .fc .fc-daygrid-day:hover {
          background-color: #f7fafc;
        }

        .fc .fc-daygrid-day-number {
          font-weight: 500;
          padding: 8px;
          color: #4a5568;
        }

        .fc .fc-daygrid-day.fc-day-today {
          background-color: #ebf8ff !important;
        }

        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          color: #3182ce;
          font-weight: 700;
        }

        .fc-event {
          border-radius: 4px;
          border: none !important;
          margin-bottom: 2px;
          padding: 2px 4px;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .fc-event:hover {
          opacity: 0.85;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .fc-event-title {
          font-weight: 500;
        }

        .fc .fc-daygrid-more-link {
          color: #3182ce;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .fc .fc-daygrid-more-link:hover {
          background-color: #ebf8ff;
          border-radius: 4px;
        }

        .fc .fc-col-header-cell {
          background-color: #f7fafc;
          font-weight: 600;
          color: #2d3748;
          padding: 10px;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.5px;
        }

        .fc .fc-scrollgrid {
          border-color: #e2e8f0 !important;
        }

        .fc th,
        .fc td {
          border-color: #e2e8f0 !important;
        }

        /* Vista de lista - Estilos mejorados */
        .fc-list-event {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .fc-list-event:hover {
          background-color: #f7fafc !important;
        }

        .fc-list-event-title {
          font-weight: 500;
        }

        .fc-list-day-cushion {
          background-color: #ebf8ff;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 10px;
          }

          .fc .fc-toolbar-chunk {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .fc .fc-toolbar-title {
            font-size: 1.2rem;
            margin: 10px 0;
          }

          .fc .fc-button {
            padding: 0.3rem 0.6rem;
            font-size: 0.85rem;
          }

          .fc-event {
            font-size: 0.75rem;
          }

          .calendar-container {
            padding: 5px;
          }
        }

        @media (max-width: 576px) {
          .fc .fc-toolbar-title {
            font-size: 1rem;
          }

          .fc .fc-daygrid-day-number {
            padding: 4px;
            font-size: 0.85rem;
          }
        }
      `}</style>
      </div>
    </>
  );
};

export default Calendario;
