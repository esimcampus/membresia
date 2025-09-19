import React from 'react';
import { Card, Form, Row, Col, Button, Image } from 'react-bootstrap';
import { DropFiles } from 'widgets';

const GeneralMiembro = () => {
  return (
    <Row className="mb-8">
      <Col xl={3} lg={4} md={12} xs={12}>
        <div className="mb-4 mb-lg-0">
          <h4 className="mb-1">Ficha de Miembro</h4>
          <p className="mb-0 fs-5 text-muted">
            Completa la información personal y de membresía.
          </p>
        </div>
      </Col>
      <Col xl={9} lg={8} md={12} xs={12}>
        <Card>
          <Card.Body>
            <div className="mb-6">
              <h4 className="mb-1">Información básica</h4>
            </div>
            <Row className="align-items-center mb-8">
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-0">Avatar</h5>
              </Col>
              <Col md={9}>
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <Image src="/images/avatar/avatar-5.jpg" className="rounded-circle avatar avatar-lg" alt="" />
                  </div>
                  <div>
                    <Button variant="outline-white" className="me-2" type="button">Cambiar</Button>
                    <Button variant="outline-white" type="button">Quitar</Button>
                  </div>
                </div>
              </Col>
            </Row>
            <Row className="mb-8">
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-0">Subir foto de perfil</h5>
              </Col>
              <Col md={9}>
                <Form className="dropzone mb-3 py-10 border-dashed">
                  <DropFiles />
                </Form>
                <Form.Text>No se eligió ningún archivo</Form.Text>
              </Col>
            </Row>
            <Form>
              <Row className="mb-3">
                <Col md={6}><Form.Label>Posadas</Form.Label><Form.Control type="text" placeholder="Posadas" /></Col>
                <Col md={6}><Form.Label>Filial y Anexo</Form.Label><Form.Control type="text" placeholder="Nombre de Filial / Anexo" /></Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}><Form.Label>Nombre y Apellido</Form.Label><Form.Control type="text" placeholder="Nombre y Apellido" /></Col>
                <Col md={6}><Form.Label>Nacionalidad</Form.Label><Form.Control type="text" placeholder="Nacionalidad" /></Col>
              </Row>
              <Row className="mb-3">
                <Col md={4}><Form.Label>DNI</Form.Label><Form.Control type="text" placeholder="DNI" /></Col>
                <Col md={2}><Form.Label>Edad</Form.Label><Form.Control type="number" placeholder="Edad" /></Col>
                <Col md={6}><Form.Label>Domicilio</Form.Label><Form.Control type="text" placeholder="Domicilio" /></Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}><Form.Label>Número de Tel (Opcional)</Form.Label><Form.Control type="text" placeholder="Número de Tel" /></Col>
                <Col md={6}><Form.Label>Estado Civil</Form.Label><Form.Select><option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option></Form.Select></Col>
              </Row>
              <Row className="mb-3">
                <Col md={2}><Form.Label>Hijos</Form.Label><Form.Control type="number" placeholder="0" /></Col>
                <Col md={5}><Form.Label>Fecha de Nacimiento</Form.Label><Form.Control type="text" placeholder="dd/mm/aaaa" /></Col>
                <Col md={5}><Form.Label>Fecha de Bautizmo</Form.Label><Form.Control type="text" placeholder="dd/mm/aaaa" /></Col>
              </Row>
              <hr />
              <Row className="mb-3">
                <Col md={6}><Form.Label>Condición</Form.Label><Form.Select><option>Activo Miembro</option><option>Inactivo</option></Form.Select></Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}><Form.Label>Traslado Fecha (Solo si corresponde)</Form.Label><Form.Control type="text" placeholder="dd/mm/aaaa" /></Col>
                <Col md={6}><Form.Label>Fecha de Defunción (Solo si corresponde)</Form.Label><Form.Control type="text" placeholder="dd/mm/aaaa" /></Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}><Form.Label>Observaciones (Opcional)</Form.Label><Form.Control as="textarea" rows={2} /></Col>
              </Row>
              <Button variant="primary" type="submit">Guardar</Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default GeneralMiembro;
