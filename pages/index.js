// import node module libraries
import { Fragment, useEffect, useState } from "react";
import Link from 'next/link';
import { Container, Col, Row } from 'react-bootstrap';
import { Briefcase, ListTask, People, Bullseye } from 'react-bootstrap-icons';

// import widget/custom components
import { StatRightTopIcon } from "widgets";

// import sub components
import { ActiveProjects } from "sub-components";

// import supabase client
import { supabase } from "lib/supabaseClient";

const Home = () => {
    const [stats, setStats] = useState([
        {
            id: 1,
            title: "Filiales",
            value: 0,
            icon: <Briefcase size={18} />,
            statInfo: '<span class="text-dark me-2">0</span> Anexos'
        },
        {
            id: 2,
            title: "Documentos",
            value: 0,
            icon: <ListTask size={18} />,
            statInfo: '<span class="text-dark me-2">0</span> Este mes'
        },
        {
            id: 3,
            title: "Miembros Activos",
            value: 0,
            icon: <People size={18} />,
            statInfo: '<span class="text-dark me-2">0</span> Total'
        },
        {
            id: 4,
            title: "Eventos",
            value: 0,
            icon: <Bullseye size={18} />,
            statInfo: '<span class="text-dark me-2">0</span> Próximos'
        }
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardStats();
    }, []);

    const loadDashboardStats = async () => {
        try {
            // Contar filiales (branches)
            const { count: branchesCount } = await supabase
                .from('branches')
                .select('*', { count: 'exact', head: true });

            // Contar anexos
            const { count: annexesCount } = await supabase
                .from('annexes')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Contar documentos totales
            const { count: documentsCount } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true });

            // Contar documentos del mes actual
            const firstDayOfMonth = new Date();
            firstDayOfMonth.setDate(1);
            firstDayOfMonth.setHours(0, 0, 0, 0);
            
            const { count: monthDocumentsCount } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', firstDayOfMonth.toISOString());

            // Contar miembros activos
            const { data: activeStatusData } = await supabase
                .from('member_statuses')
                .select('member_status_id')
                .eq('name', 'Activo')
                .single();

            let activeMembersCount = 0;
            let totalMembersCount = 0;

            if (activeStatusData) {
                const { count: activeCount } = await supabase
                    .from('members')
                    .select('*', { count: 'exact', head: true })
                    .eq('member_status_id', activeStatusData.member_status_id);
                activeMembersCount = activeCount || 0;
            }

            // Contar total de miembros
            const { count: totalCount } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true });
            totalMembersCount = totalCount || 0;

            // Contar eventos totales activos
            const { count: eventsCount } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Contar eventos próximos (desde hoy en adelante)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: upcomingEventsCount } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .gte('event_date', today.toISOString().split('T')[0]);

            // Actualizar stats
            setStats([
                {
                    id: 1,
                    title: "Filiales",
                    value: branchesCount || 0,
                    icon: <Briefcase size={18} />,
                    statInfo: `<span class="text-dark me-2">${annexesCount || 0}</span> Anexos`
                },
                {
                    id: 2,
                    title: "Documentos",
                    value: documentsCount || 0,
                    icon: <ListTask size={18} />,
                    statInfo: `<span class="text-dark me-2">${monthDocumentsCount || 0}</span> Este mes`
                },
                {
                    id: 3,
                    title: "Miembros Activos",
                    value: activeMembersCount,
                    icon: <People size={18} />,
                    statInfo: `<span class="text-dark me-2">${totalMembersCount}</span> Total`
                },
                {
                    id: 4,
                    title: "Eventos",
                    value: eventsCount || 0,
                    icon: <Bullseye size={18} />,
                    statInfo: `<span class="text-dark me-2">${upcomingEventsCount || 0}</span> Próximos`
                }
            ]);

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fragment>
            <div className="bg-primary pt-10 pb-21"></div>
            <Container fluid className="mt-n22 px-6">
                <Row>
                    <Col lg={12} md={12} xs={12}>
                        {/* Page header */}
                        <div>
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="mb-2 mb-lg-0">
                                    <h3 className="mb-0  text-white">Gestor de Membresía</h3>
                                </div>
                                <div>
                                    <Link href="/pages/calendario" className="btn btn-white">Calendario</Link>
                                </div>
                            </div>
                        </div>
                    </Col>
                    {stats.map((item, index) => {
                        return (
                            <Col xl={3} lg={6} md={12} xs={12} className="mt-6" key={index}>
                                <StatRightTopIcon info={item} />
                            </Col>
                        )
                    })}
                </Row>

                {/* Active Projects  */}
                <ActiveProjects />

                {/* Teams y TasksPerformance ocultos temporalmente */}
                {/* <Row className="my-6">
                    <Col xl={4} lg={12} md={12} xs={12} className="mb-6 mb-xl-0">
                        <TasksPerformance />
                    </Col>
                    <Col xl={8} lg={12} md={12} xs={12}>
                        <Teams />
                    </Col>
                </Row> */}
            </Container>
        </Fragment>
    )
}
export default Home;
