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
import { useUserPermissions } from "hooks/useUserPermissions";

const Home = () => {
    const { isManager, memberBranchId, loading: permLoading } = useUserPermissions();
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
        if (!permLoading) {
            loadDashboardStats();
        }
    }, [permLoading, isManager, memberBranchId]);

    const loadDashboardStats = async () => {
        try {
            console.log('📊 Iniciando carga de estadísticas - isManager:', isManager, 'memberBranchId:', memberBranchId);
            
            let branchesCount = 0;
            let annexesCount = 0;

            // Contar filiales y anexos
            if (isManager && memberBranchId) {
                // Gestor: solo su filial
                console.log('📊 Cargando estadísticas para Gestor - filial:', memberBranchId);
                
                branchesCount = 1; // Los gestores solo ven su filial

                const { count: managerAnnexesCount } = await supabase
                    .from('annexes')
                    .select('*', { count: 'exact', head: true })
                    .eq('branch_id', memberBranchId)
                    .eq('is_active', true);
                annexesCount = managerAnnexesCount || 0;
                console.log('✅ Anexos del Gestor:', annexesCount);
            } else {
                // Admin: todas las filiales
                console.log('📊 Cargando estadísticas para Admin');
                const { count: allBranchesCount } = await supabase
                    .from('branches')
                    .select('*', { count: 'exact', head: true });
                branchesCount = allBranchesCount || 0;

                const { count: allAnnexesCount } = await supabase
                    .from('annexes')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);
                annexesCount = allAnnexesCount || 0;
            }

            // Contar documentos totales
            let documentsCount = 0;
            let monthDocumentsCount = 0;

            let docQuery = supabase
                .from('documents')
                .select('*', { count: 'exact', head: true });

            if (isManager && memberBranchId) {
                docQuery = docQuery.eq('branch_id', memberBranchId);
            }

            const { count: totalDocCount } = await docQuery;
            documentsCount = totalDocCount || 0;
            console.log('✅ Documentos totales:', documentsCount);

            // Documentos del mes actual
            const firstDayOfMonth = new Date();
            firstDayOfMonth.setDate(1);
            firstDayOfMonth.setHours(0, 0, 0, 0);
            
            let monthDocQuery = supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', firstDayOfMonth.toISOString());

            if (isManager && memberBranchId) {
                monthDocQuery = monthDocQuery.eq('branch_id', memberBranchId);
            }

            const { count: monthDocCount } = await monthDocQuery;
            monthDocumentsCount = monthDocCount || 0;
            console.log('✅ Documentos este mes:', monthDocumentsCount);

            // Contar miembros activos
            const { data: activeStatusData } = await supabase
                .from('member_statuses')
                .select('member_status_id')
                .eq('name', 'Activo')
                .single();

            let activeMembersCount = 0;
            let totalMembersCount = 0;

            if (activeStatusData) {
                if (isManager && memberBranchId) {
                    // Obtener anexos de la filial del gestor primero
                    const { data: annexIds } = await supabase
                        .from('annexes')
                        .select('annex_id')
                        .eq('branch_id', memberBranchId);

                    console.log('✅ Anexos obtenidos:', annexIds?.length || 0);

                    if (annexIds && annexIds.length > 0) {
                        const annexIdList = annexIds.map(a => a.annex_id);
                        
                        // Miembros activos en anexos del gestor
                        const { count: activeCount } = await supabase
                            .from('members')
                            .select('member_id', { count: 'exact', head: true })
                            .eq('member_status_id', activeStatusData.member_status_id)
                            .in('annex_id', annexIdList);
                        
                        activeMembersCount = activeCount || 0;

                        // Total de miembros en anexos del gestor
                        const { count: totalCount } = await supabase
                            .from('members')
                            .select('*', { count: 'exact', head: true })
                            .in('annex_id', annexIdList);
                        
                        totalMembersCount = totalCount || 0;
                    } else {
                        activeMembersCount = 0;
                        totalMembersCount = 0;
                    }
                } else {
                    // Admin: contar de todos
                    const { count: activeCount } = await supabase
                        .from('members')
                        .select('*', { count: 'exact', head: true })
                        .eq('member_status_id', activeStatusData.member_status_id);
                    activeMembersCount = activeCount || 0;

                    const { count: totalCount } = await supabase
                        .from('members')
                        .select('*', { count: 'exact', head: true });
                    totalMembersCount = totalCount || 0;
                }
            }

            console.log('✅ Miembros activos:', activeMembersCount, 'Total:', totalMembersCount);

            // Contar eventos totales activos
            let eventsQuery = supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            if (isManager && memberBranchId) {
                eventsQuery = eventsQuery.eq('branch_id', memberBranchId);
            }

            const { count: eventsCount } = await eventsQuery;
            console.log('✅ Eventos totales:', eventsCount);

            // Contar eventos próximos (desde hoy en adelante)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let upcomingEventsQuery = supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .gte('event_date', today.toISOString().split('T')[0]);

            if (isManager && memberBranchId) {
                upcomingEventsQuery = upcomingEventsQuery.eq('branch_id', memberBranchId);
            }

            const { count: upcomingEventsCount } = await upcomingEventsQuery;
            console.log('✅ Eventos próximos:', upcomingEventsCount);

            // Actualizar stats
            const newStats = [
                {
                    id: 1,
                    title: isManager ? "Mi Filial" : "Filiales",
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
            ];

            console.log('📊 Stats finales:', newStats);
            setStats(newStats);

        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
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
