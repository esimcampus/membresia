// import node module libraries
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Image, Spinner } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import { useRouter } from 'next/router';

const UnidadEquipo = () => {
  const router = useRouter();
  const { id } = router.query; // branch_id
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadManagers();
  }, [id]);

  const loadManagers = async () => {
    try {
      setLoading(true);
      console.log('Cargando gestores para branch_id:', id);
      
      // Cargar gestores de filial (branch_managers)
      // Solo mostrar usuarios con rol de Gestor de Filiales (level 2), excluir administradores (level 1)
      const { data, error } = await supabase
        .from('branch_managers')
        .select(`
          user_id,
          system_users (
            user_id,
            email,
            is_active,
            roles (level, role_name),
            members (
              member_id,
              first_name,
              last_name,
              avatar_url,
              phone
            )
          )
        `)
        .eq('branch_id', id);

      console.log('Respuesta branch_managers:', { data, error });

      if (error) throw error;
      
      // Filtrar y aplanar los datos
      const managersList = (data || [])
        .map(item => item.system_users)
        .filter(su => {
          // Filtrar: debe estar activo y ser gestor (level 2)
          return su && su.members && su.is_active && su.roles?.level === 2;
        })
        .map(su => ({
          ...su.members,
          email: su.email,
          role_name: su.roles?.role_name
        }));

      console.log('Gestores procesados:', managersList);
      setManagers(managersList);
    } catch (e) {
      console.error('Error cargando gestores de filial:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title as="h4">Gestores</Card.Title>
        {managers.length === 0 ? (
          <p className="text-muted">No hay gestores asignados a esta filial.</p>
        ) : (
          managers.map((manager, idx) => (
            <div 
              className={`d-flex justify-content-between align-items-center ${idx < managers.length - 1 ? 'mb-4' : ''}`}
              key={manager.member_id}
            >
              <div className="d-flex align-items-center">
                <div>
                  <Image
                    src={manager.avatar_url || '/images/avatar/profile.jpg'}
                    className="rounded-circle avatar-md"
                    alt={`${manager.first_name} ${manager.last_name}`}
                  />
                </div>
                <div className="ms-3">
                  <h5 className="mb-1">{manager.first_name} {manager.last_name}</h5>
                  <p className="text-muted mb-0 fs-5">
                    {manager.role_name || 'Gestor de Filiales'}
                  </p>
                </div>
              </div>
              <div>
                {manager.phone && (
                  <Link href={`tel:${manager.phone}`} className="text-muted text-primary-hover me-3">
                    <i className="fe fe-phone-call fs-4"></i>
                  </Link>
                )}
                {manager.email && (
                  <Link href={`mailto:${manager.email}`} className="text-muted text-primary-hover">
                    <i className="fe fe-mail fs-4"></i>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </Card.Body>
    </Card>
  );
};

export default UnidadEquipo;
