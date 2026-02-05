import React, { useState } from "react";
import { useRouter } from "next/router";
import { Row, Col, Card, Form, Button, Image } from "react-bootstrap";
import Link from "next/link";
import { supabase } from "lib/supabaseClient";
import { useActiveBranch } from "context/ActiveBranchContext";
import AuthLayout from "layouts/AuthLayout";

const SignIn = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setActiveBranchId } = useActiveBranch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      // Usamos email como "username" para Supabase; si prefieres usuario, crea una columna en auth.users metadata
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password
      });
      if (authError) {
        setError(authError.message || "No se pudo iniciar sesión");
        setIsLoading(false);
        return;
      }
      
      // Cargar rol del usuario y filial asignada si es Gestor
      try {
        const { data: systemUser } = await supabase
          .from('system_users')
          .select('role_id, member_id, roles(level)')
          .eq('user_id', data.user.id)
          .single();
        
        if (systemUser?.roles?.level === 2) {
          // Es Gestor - obtener su filial asignada
          const { data: memberData } = await supabase
            .from('members')
            .select('annexes(branches(branch_id))')
            .eq('member_id', systemUser.member_id)
            .single();
          
          const branchId = memberData?.annexes?.branches?.branch_id;
          if (branchId) {
            setActiveBranchId(String(branchId));
          }
        } else {
          // Limpiar filial activa si no es Gestor
          setActiveBranchId(null);
        }
      } catch (err) {
        console.error('Error cargando datos del usuario:', err);
      }
      
      // Redirige a home tras login
      router.push("/pages/calendario");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="mb-4 text-center">
              <Link href="/">
                <Image
                  src="/images/brand/logo/logo.jpeg"
                  className="mb-2"
                  style={{ maxWidth: '70%', width: '100%', height: 'auto' }}
                  alt=""
                />
                {/* <Image
                  src="/images/brand/logo/logo.svg"
                  className="mb-2"
                  alt=""
                /> */}
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
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Iniciando sesión...
                      </>
                    ) : (
                      'Ingresar'
                    )}
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
