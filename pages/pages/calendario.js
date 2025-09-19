import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Card } from 'react-bootstrap';
import { PageHeading } from 'widgets';

const eventos = [
  {
    title: 'Reunión de líderes',
    start: '2025-09-20T18:00:00',
    sede: 'POSADAS / LAS ROSAS',
    color: '#3182ce',
  },
  {
    title: 'Culto especial',
    start: '2025-09-22T20:00:00',
    sede: 'POSADAS / LA ESPERANZA',
    color: '#38a169',
  },
  {
    title: 'Taller de música',
    start: '2025-09-25T17:00:00',
    sede: 'POSADAS / LAS ROSAS',
    color: '#ecc94b',
  },
  {
    title: 'Cena de confraternidad',
    start: '2025-09-28T21:00:00',
    sede: 'POSADAS / LA ESPERANZA',
    color: '#805ad5',
  },
  {
    title: 'Estudio bíblico',
    start: '2025-09-30T19:30:00',
    sede: 'POSADAS / LAS ROSAS',
    color: '#718096',
  },
];

const Calendario = () => {
  const calendarRef = useRef(null);
  return (
    <div className="container py-4">
      <PageHeading heading="Calendario de Eventos" />
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale="es"
            events={eventos}
            eventContent={renderEventContent}
            height="auto"
            ref={calendarRef}
          />
        </Card.Body>
      </Card>
    </div>
  );
};

function renderEventContent(eventInfo) {
  return (
    <div style={{ fontWeight: 500, color: eventInfo.event.backgroundColor }}>
      <span>{eventInfo.event.title}</span>
      <br />
      <span style={{ fontSize: '0.85em', color: '#4a5568' }}>{eventInfo.event.extendedProps.sede}</span>
    </div>
  );
}

export default Calendario;
