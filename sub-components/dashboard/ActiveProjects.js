// import node module libraries
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProgressBar, Col, Row, Card, Table, Image, Spinner } from 'react-bootstrap';

// import supabase client
import { supabase } from 'lib/supabaseClient';

const ActiveProjects = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBranchesData();
    }, []);

    const loadBranchesData = async () => {
        try {
            // Obtener todas las filiales
            const { data: branchesData, error: branchesError } = await supabase
                .from('branches')
                .select(`
                    branch_id,
                    name,
                    countries (name)
                `)
                .order('name');

            if (branchesError) throw branchesError;

            // Obtener total de eventos en el sistema
            const { count: totalEvents } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Para cada filial, obtener su información
            const branchesWithData = await Promise.all(
                branchesData.map(async (branch) => {
                    // Contar miembros de la filial (todos los anexos)
                    const { data: annexesData } = await supabase
                        .from('annexes')
                        .select('annex_id')
                        .eq('branch_id', branch.branch_id)
                        .eq('is_active', true);

                    const annexIds = annexesData?.map(a => a.annex_id) || [];

                    let membersCount = 0;
                    if (annexIds.length > 0) {
                        const { count } = await supabase
                            .from('members')
                            .select('*', { count: 'exact', head: true })
                            .in('annex_id', annexIds);
                        membersCount = count || 0;
                    }

                    // Contar eventos de la filial
                    const { count: branchEvents } = await supabase
                        .from('events')
                        .select('*', { count: 'exact', head: true })
                        .eq('branch_id', branch.branch_id)
                        .eq('is_active', true);

                    // Calcular porcentaje de participación
                    const participation = totalEvents > 0 
                        ? Math.round((branchEvents / totalEvents) * 100) 
                        : 0;

                    // Determinar badge de participación según porcentaje
                    let participationBadge = 'danger';
                    let participationText = 'Baja';
                    
                    if (participation > 50) {
                        participationText = 'Alta';
                        participationBadge = 'success';
                    } else if (participation >= 20) {
                        participationText = 'Media';
                        participationBadge = 'warning';
                    } else {
                        participationText = 'Baja';
                        participationBadge = 'danger';
                    }

                    // Obtener gestores de la filial
                    const { data: managersData } = await supabase
                        .from('branch_managers')
                        .select(`
                            user_id,
                            system_users!inner (
                                member_id,
                                members (
                                    member_id,
                                    first_name,
                                    last_name,
                                    avatar_url
                                )
                            )
                        `)
                        .eq('branch_id', branch.branch_id);

                    const managers = managersData?.map(m => ({
                        member_id: m.system_users?.members?.member_id,
                        first_name: m.system_users?.members?.first_name,
                        last_name: m.system_users?.members?.last_name,
                        avatar_url: m.system_users?.members?.avatar_url
                    })).filter(m => m.member_id) || [];

                    return {
                        branch_id: branch.branch_id,
                        name: branch.name,
                        country: branch.countries?.name || '',
                        membersCount,
                        eventsCount: branchEvents || 0,
                        participation,
                        participationBadge,
                        participationText,
                        managers
                    };
                })
            );

            setBranches(branchesWithData);
        } catch (error) {
            console.error('Error cargando filiales:', error);
        } finally {
            setLoading(false);
        }
    };

    // Obtener iniciales del nombre
    const getInitials = (firstName, lastName) => {
        const first = firstName?.charAt(0) || '';
        const last = lastName?.charAt(0) || '';
        return (first + last).toUpperCase();
    };

    return (
        <Row className="mt-6">
            <Col md={12} xs={12}>
                <Card>
                    <Card.Header className="bg-white  py-4">
                        <h4 className="mb-0">Unidades</h4>
                    </Card.Header>
                    <Table responsive className="text-nowrap mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Sede</th>
                                <th>Miembros</th>
                                <th>Participación</th>
                                <th>Responsables</th>
                                <th>Activos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5">
                                        <Spinner animation="border" role="status" variant="primary">
                                            <span className="visually-hidden">Cargando...</span>
                                        </Spinner>
                                    </td>
                                </tr>
                            ) : branches.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        No hay filiales registradas
                                    </td>
                                </tr>
                            ) : (
                                branches.map((branch, index) => (
                                    <tr key={branch.branch_id}>
                                        <td className="align-middle">
                                            <div className="d-flex align-items-center">
                                                <div>
                                                    <div className="icon-shape icon-md border p-4 rounded-1 bg-light">
                                                        <i className="fe fe-map-pin text-primary" style={{ fontSize: '1.5rem' }}></i>
                                                    </div>
                                                </div>
                                                <div className="ms-3 lh-1">
                                                    <h5 className="mb-1">
                                                        <Link 
                                                            href={`/pages/unidad?id=${branch.branch_id}`} 
                                                            className="text-inherit"
                                                        >
                                                            {branch.name}
                                                        </Link>
                                                    </h5>
                                                    <small className="text-muted">{branch.country}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="align-middle">
                                            <span className="text-dark fw-semibold">{branch.membersCount}</span>
                                        </td>
                                        <td className="align-middle">
                                            <span className={`badge bg-${branch.participationBadge}`}>
                                                {branch.participationText}
                                            </span>
                                        </td>
                                        <td className="align-middle">
                                            <div className="avatar-group">
                                                {branch.managers.length === 0 ? (
                                                    <span className="text-muted small">Sin gestores</span>
                                                ) : (
                                                    <>
                                                        {branch.managers.slice(0, 3).map((manager, managerIndex) => (
                                                            <span 
                                                                className="avatar avatar-sm" 
                                                                key={manager.member_id}
                                                                title={`${manager.first_name} ${manager.last_name}`}
                                                            >
                                                                {manager.avatar_url ? (
                                                                    <Image 
                                                                        alt={`${manager.first_name} ${manager.last_name}`}
                                                                        src={manager.avatar_url} 
                                                                        className="rounded-circle" 
                                                                    />
                                                                ) : (
                                                                    <span className="avatar-initials rounded-circle bg-primary">
                                                                        {getInitials(manager.first_name, manager.last_name)}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ))}
                                                        {branch.managers.length > 3 && (
                                                            <span className="avatar avatar-sm avatar-primary">
                                                                <span className="avatar-initials rounded-circle fs-6">
                                                                    +{branch.managers.length - 3}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="align-middle text-dark">
                                            <div className="float-start me-3">{branch.participation}%</div>
                                            <div className="mt-2">
                                                <ProgressBar 
                                                    now={branch.participation} 
                                                    style={{ height: '5px' }}
                                                    variant={branch.participation > 50 ? 'success' : branch.participation > 20 ? 'warning' : 'danger'}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                    <Card.Footer className="bg-white text-center">
                        <Link href="/pages/unidad" className="link-primary">Ver más unidades</Link>
                    </Card.Footer>
                </Card>
            </Col>
        </Row>
    )
}

export default ActiveProjects