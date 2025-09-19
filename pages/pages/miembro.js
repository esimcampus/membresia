// import node module libraries
import { Col, Row, Container } from 'react-bootstrap';
import { PageHeading } from 'widgets';
import GeneralMiembro from 'sub-components/settings/GeneralMiembro';

const Miembro = () => {
  return (
    <Container fluid className="p-6">
      <PageHeading heading="Ficha de Miembro"/>
      <Row>
        <Col xl={8} lg={8} md={12} xs={12}>
          <GeneralMiembro />
        </Col>
      </Row>
    </Container>
  );
};

export default Miembro;
