import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { PageHeading } from 'widgets';
import miembrosData from 'data/miembrosData';
import { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

const ListaMiembros = () => {
  const [filtro, setFiltro] = useState("");
  // Asignar avatar aleatorio por índice
  const miembrosConAvatar = miembrosData.map((m, idx) => ({
    ...m,
    avatar: `/images/avatar/avatar-${(idx % 20) + 1}.jpg`
  }));
  const miembrosFiltrados = miembrosConAvatar.filter((m) => {
    const texto = `${m.nombre} ${m.filial} ${m.dni}`.toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  return (
    <Container fluid className="p-6">
      <Card className="mb-4 shadow-sm border-0" style={{ background: "#f8fafc" }}>
        <Card.Body className="d-flex flex-column flex-md-row align-items-center justify-content-between" style={{ background: "#e3e7ed" }}>
          <div>
            <h2 className="mb-0" style={{ color: "#2a4365", fontWeight: 700 }}>Lista de Miembros</h2>
            <p className="mb-0" style={{ color: "#4a5568" }}>Consulta y gestiona los miembros de todas las filiales.</p>
          </div>
          <Form className="mt-3 mt-md-0" style={{ minWidth: 260 }}>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre, filial o DNI..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                style={{ borderRadius: "20px" }}
              />
            </InputGroup>
          </Form>
        </Card.Body>
      </Card>
      <div className="table-responsive">
        <Table bordered hover className="align-middle">
          <thead style={{ background: "#e3e7ed" }}>
            <tr>
              <th style={{ color: "#2a4365" }}>Avatar</th>
              <th style={{ color: "#2a4365" }}>Filial / Anexo</th>
              <th style={{ color: "#2a4365" }}>Nombre</th>
              <th style={{ color: "#2a4365" }}>Fecha Nac.</th>
              <th style={{ color: "#2a4365" }}>Nacionalidad</th>
              <th style={{ color: "#2a4365" }}>DNI</th>
              <th style={{ color: "#2a4365" }}>Teléfono</th>
              <th style={{ color: "#2a4365" }}>Edad</th>
              <th style={{ color: "#2a4365" }}>Domicilio</th>
              <th style={{ color: "#2a4365" }}>Estado Civil</th>
              <th style={{ color: "#2a4365" }}>Hijos</th>
              <th style={{ color: "#2a4365" }}>Estado</th>
              <th style={{ color: "#2a4365" }}>F. Bautizmo</th>
              <th style={{ color: "#2a4365" }}>F. Traslado</th>
              <th style={{ color: "#2a4365" }}>F. Defunción</th>
              <th style={{ color: "#2a4365" }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {miembrosFiltrados.map((m, idx) => (
              <tr key={idx}>
                <td>
                  <img
                    src={m.avatar}
                    alt="avatar"
                    className="rounded-circle border border-2 border-primary"
                    width={40}
                    height={40}
                  />
                </td>
                <td>{m.filial}</td>
                <td style={{ fontWeight: 500 }}>{m.nombre}</td>
                <td>{m.fecha_nac}</td>
                <td>{m.nacionalidad}</td>
                <td>{m.dni}</td>
                <td>{m.tel || <span className="text-muted">-</span>}</td>
                <td>{m.edad}</td>
                <td>{m.domicilio}</td>
                <td>{m.estado_civil}</td>
                <td>{m.hijos}</td>
                <td><Badge bg={m.estado.includes("Activo") ? "success" : "secondary"}>{m.estado}</Badge></td>
                <td>{m.f_bautizmo}</td>
                <td>{m.f_traslado || <span className="text-muted">-</span>}</td>
                <td>{m.f_defuncion || <span className="text-muted">-</span>}</td>
                <td>{m.observaciones || <span className="text-muted">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default ListaMiembros;
