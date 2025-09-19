import React, { useState } from "react";
import { useRouter } from "next/router";
import { Row, Col, Card, Form, Button, Image } from "react-bootstrap";
import Link from "next/link";

// import authlayout to override default layout
import AuthLayout from "layouts/AuthLayout";

const SignIn = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Usuario y clave hardcodeados
    if (username === "admin" && password === "1234") {
      router.push("/");
    } else {
      setError("Usuario o clave incorrectos");
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="mb-4">
              <Link href="/">
                <Image
                  src="/images/brand/logo/logo-primary.svg"
                  className="mb-2"
                  alt=""
                />
              </Link>
              <p className="mb-6">Por favor ingresa tus datos.</p>
            </div>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="username">
                <Form.Label>Usuario</Form.Label>
                <Form.Control
                  type="text"
                  name="username"
                  placeholder="Usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Clave</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="**************"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </Form.Group>
              {error && <div className="text-danger mb-3">{error}</div>}
              <div className="d-lg-flex justify-content-between align-items-center mb-4">
                <Form.Check type="checkbox" id="rememberme">
                  <Form.Check.Input type="checkbox" />
                  <Form.Check.Label>Recordarme</Form.Check.Label>
                </Form.Check>
              </div>
              <div>
                <div className="d-grid">
                  <Button variant="primary" type="submit">
                    Ingresar
                  </Button>
                </div>
                <div className="d-md-flex justify-content-between mt-4">
                  <div className="mb-2 mb-md-0">
                    <Link href="/authentication/sign-up" className="fs-5">
                      Crear cuenta
                    </Link>
                  </div>
                  <div>
                    <Link
                      href="/authentication/forget-password"
                      className="text-inherit fs-5"
                    >
                      ¿Olvidaste tu clave?
                    </Link>
                  </div>
                </div>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

SignIn.Layout = AuthLayout;

export default SignIn;
