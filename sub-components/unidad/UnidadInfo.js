// import node module libraries
import { Col, Row, Card } from 'react-bootstrap';

const UnidadInfo = () => {
    return (
        <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
            {/* card */}
            <Card>
                {/* card body */}
                <Card.Body>
                    {/* card title */}
                <Card.Title as="h4">Sobre la Sede</Card.Title>
                <span className="text-uppercase fw-medium text-dark fs-5 ls-2">Descripción</span>
                <p className="mt-2 mb-6">Esta sede es parte de nuestra red nacional y gestiona miembros, actividades y eventos en su localidad. Aquí encontrarás información relevante sobre la unidad y su funcionamiento.
                </p>
                    <Row>
                        <Col xs={12} className="mb-5">
                            <h6 className="text-uppercase fs-5 ls-2">Tipo de Unidad</h6>
                            <p className="mb-0">Sede Regional</p>
                        </Col>
                        <Col xs={6} className="mb-5">
                            <h6 className="text-uppercase fs-5 ls-2">Teléfono</h6>
                            <p className="mb-0">+54 11 1234-5678</p>
                        </Col>
                        <Col xs={6} className="mb-5">
                            <h6 className="text-uppercase fs-5 ls-2">Fecha de Fundación</h6>
                            <p className="mb-0">01/10/2010</p>
                        </Col>
                        <Col xs={6}>
                            <h6 className="text-uppercase fs-5 ls-2">Correo electrónico</h6>
                            <p className="mb-0">sede@organizacion.com</p>
                        </Col>
                        <Col xs={6}>
                            <h6 className="text-uppercase fs-5 ls-2">Ubicación</h6>
                            <p className="mb-0">Buenos Aires, Argentina</p>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </Col>
    )
}

export default UnidadInfo;