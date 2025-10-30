// import node module libraries
import { Row, Col, Card, Alert } from "react-bootstrap";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

// import authlayout to override default layout
import AuthLayout from "layouts/AuthLayout";

const ForgetPassword = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente al login
    router.replace('/authentication/sign-in');
  }, [router]);

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <Alert variant="warning">
              <Alert.Heading>Página no disponible</Alert.Heading>
              <p className="mb-0">
                Esta funcionalidad está temporalmente deshabilitada. 
                Serás redirigido al inicio de sesión...
              </p>
            </Alert>
            <div className="mt-3">
              <Link href="/authentication/sign-in" className="btn btn-primary">
                Volver al inicio de sesión
              </Link>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

ForgetPassword.Layout = AuthLayout;

export default ForgetPassword;
