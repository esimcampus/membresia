// import node module libraries
import { Col, Row, Container } from 'react-bootstrap';
import { PageHeading } from 'widgets';
import EditarMiembro from 'sub-components/settings/EditarMiembro';
import { useRouter } from 'next/router';

const EditarMiembroPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <Container fluid className="p-6">
      <PageHeading heading="Editar Miembro"/>
      <Row>
        <Col xl={8} lg={8} md={12} xs={12}>
          {id ? <EditarMiembro memberId={id} /> : <p>Cargando...</p>}
        </Col>
      </Row>
    </Container>
  );
};

export default EditarMiembroPage;
