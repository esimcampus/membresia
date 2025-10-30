import React, { useState } from "react";
import { useRouter } from "next/router";
import { Row, Col, Card, Form, Button, Image } from "react-bootstrap";
import Link from "next/link";
import { supabase } from "lib/supabaseClient";

// import authlayout to override default layout
import AuthLayout from "layouts/AuthLayout";

const SignIn = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // Usamos email como "username" para Supabase; si prefieres usuario, crea una columna en auth.users metadata
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password
    });
    if (authError) {
      setError(authError.message || "No se pudo iniciar sesión");
      return;
    }
    // Redirige a home tras login
    router.push("/");
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="mb-4">
              <Link href="/">
                <Image
                  src="/images/brand/logo/logo.svg"
                  className="mb-2"
                  alt=""
                />
              </Link>
              <p className="mb-6">Por favor ingresa tus datos.</p>
            </div>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="username">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="tucorreo@dominio.com"
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
