// import node module libraries
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Row, Col, Card, Badge, Spinner, Alert } from "react-bootstrap";
import { supabase } from "lib/supabaseClient";

const UnidadActividad = () => {
  const router = useRouter();
  const { id } = router.query;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadEvents();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: eventsError } = await supabase
        .from('events')
        .select(`
          event_id,
          name,
          description,
          event_date,
          start_time,
          end_time,
          annexes (name)
        `)
        .eq('branch_id', id)
        .eq('is_active', true)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (eventsError) throw eventsError;

      setEvents(data || []);
    } catch (e) {
      console.error('Error cargando eventos:', e);
      setError('Error al cargar los eventos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return null;
    return timeString.substring(0, 5); // HH:MM
  };

  const getEventStatus = (eventDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);

    if (eventDay < today) {
      return { variant: 'secondary', text: 'Pasado' };
    } else if (eventDay.getTime() === today.getTime()) {
      return { variant: 'success', text: 'Hoy' };
    } else {
      return { variant: 'primary', text: 'Próximo' };
    }
  };

  if (loading) {
    return (
      <Row>
        <Col xs={12}>
          <Card>
            <Card.Body className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
              <p className="mt-3 mb-0 text-muted">Cargando eventos...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Card.Title as="h4" className="mb-0">
                Eventos Planificados
              </Card.Title>
              <Link 
                href={`/pages/calendario?id=${id}`}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="fe fe-calendar me-1"></i>
                Ver Calendario
              </Link>
            </div>

            {error && (
              <Alert variant="danger">
                {error}
              </Alert>
            )}

            {!loading && events.length === 0 && (
              <div className="text-center py-5">
                <i className="fe fe-calendar" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                <p className="text-muted mt-3 mb-0">
                  No hay eventos planificados para esta filial
                </p>
                <Link 
                  href={`/pages/calendario?id=${id}`}
                  className="btn btn-sm btn-primary mt-3"
                >
                  <i className="fe fe-plus me-1"></i>
                  Crear Evento
                </Link>
              </div>
            )}

            {events.map((event, index) => {
              const status = getEventStatus(event.event_date);
              
              return (
                <div 
                  key={event.event_id} 
                  className={`d-flex align-items-start ${index < events.length - 1 ? 'mb-4 pb-4 border-bottom' : ''}`}
                >
                  {/* Icono de evento */}
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: status.variant === 'primary' ? '#ebf8ff' : 
                                     status.variant === 'success' ? '#c6f6d5' : '#e2e8f0',
                      color: status.variant === 'primary' ? '#3182ce' : 
                             status.variant === 'success' ? '#38a169' : '#718096'
                    }}
                  >
                    <i className="fe fe-calendar" style={{ fontSize: '1.5rem' }}></i>
                  </div>

                  {/* Información del evento */}
                  <div className="ms-3 flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="mb-0">{event.name}</h5>
                      <Badge bg={status.variant} className="ms-2">
                        {status.text}
                      </Badge>
                    </div>

                    {event.description && (
                      <p className="text-muted mb-2">
                        {event.description}
                      </p>
                    )}

                    <div className="d-flex flex-wrap gap-3 text-muted">
                      <small>
                        <i className="fe fe-calendar me-1"></i>
                        {formatDate(event.event_date)}
                      </small>
                      
                      {event.start_time && (
                        <small>
                          <i className="fe fe-clock me-1"></i>
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </small>
                      )}

                      {event.annexes?.name && (
                        <small>
                          <i className="fe fe-map-pin me-1"></i>
                          {event.annexes.name}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default UnidadActividad;
