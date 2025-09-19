// import node module libraries
import { Col, Row, Container } from 'react-bootstrap';

// import widget as custom components
import { PageHeading } from 'widgets'

// import sub components
import {
  UnidadInfo,
  UnidadActividad,
  UnidadEquipo,
  UnidadHeader,
  UnidadContribuciones,
  UnidadBlog
} from 'sub-components'

const Profile = () => {
  return (
    <Container fluid className="p-6">
      {/* Encabezado de la página */}
      <PageHeading heading="Resumen de la Sede"/>

      {/* Encabezado de la Unidad */}
      <UnidadHeader />

      {/* contenido */}
      <div className="py-6">
        <Row>
          {/* Información de la Sede */}
          <UnidadInfo />

          {/* Contribuciones y Eventos */}
          <UnidadContribuciones />

          {/* Blog y novedades */}
          <UnidadBlog />

          <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
            {/* Equipo de la Sede */}
            <UnidadEquipo />

            {/* Actividad de la Sede */}
            <UnidadActividad />
          </Col>
        </Row>
      </div>

    </Container>
  )
}

export default Profile