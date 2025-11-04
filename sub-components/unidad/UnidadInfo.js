// import node module libraries
import { useEffect, useState } from 'react';
import { Col, Row, Card, Spinner } from 'react-bootstrap';
import { supabase } from 'lib/supabaseClient';
import { useRouter } from 'next/router';

const UnidadInfo = () => {
    const router = useRouter();
    const { id } = router.query; // branch_id
    const [branch, setBranch] = useState(null);
    const [headquarter, setHeadquarter] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        loadBranchData();
    }, [id]);

    const loadBranchData = async () => {
        try {
            setLoading(true);
            // Cargar información de la filial
            const { data: branchData, error: branchErr } = await supabase
                .from('branches')
                .select(`
                    branch_id,
                    name,
                    countries (name)
                `)
                .eq('branch_id', id)
                .single();

            if (branchErr) throw branchErr;
            setBranch(branchData);

            // Cargar el anexo sede de esta filial
            const { data: hqData, error: hqErr } = await supabase
                .from('annexes')
                .select(`
                    annex_id,
                    name,
                    address,
                    description,
                    phone,
                    email,
                    cities (name, states (name))
                `)
                .eq('branch_id', id)
                .eq('is_headquarters', true)
                .eq('is_active', true)
                .maybeSingle();

            if (hqErr) throw hqErr;
            setHeadquarter(hqData);
        } catch (e) {
            console.error('Error cargando datos de la filial:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
                <Card>
                    <Card.Body className="text-center py-5">
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </Spinner>
                    </Card.Body>
                </Card>
            </Col>
        );
    }

    if (!branch) {
        return (
            <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
                <Card>
                    <Card.Body>
                        <p className="text-muted">No se encontró información de la filial</p>
                    </Card.Body>
                </Card>
            </Col>
        );
    }

    return (
        <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
            <Card>
                <Card.Body>
                    <Card.Title as="h4">Sobre la Unidad</Card.Title>
                    <span className="fw-medium text-dark fs-5 ls-2">Descripción</span>
                    <p className="mt-2 mb-6">
                        {headquarter?.description || 'Sin descripción disponible.'}
                    </p>
                    <Row>
                        <Col xs={12} className="mb-5">
                            <h6 className="fs-5 ls-2">Nombre</h6>
                            <p className="mb-0">{headquarter?.name || '-'}</p>
                        </Col>
                        <Col xs={6} className="mb-5">
                            <h6 className="fs-5 ls-2">Teléfono</h6>
                            <p className="mb-0">{headquarter?.phone || '-'}</p>
                        </Col>
                        <Col xs={6} className="mb-5">
                            <h6 className="fs-5 ls-2">Dirección</h6>
                            <p className="mb-0">{headquarter?.address || '-'}</p>
                        </Col>
                        <Col xs={6}>
                            <h6 className="fs-5 ls-2">Correo electrónico</h6>
                            <p className="mb-0">{headquarter?.email || '-'}</p>
                        </Col>
                        <Col xs={6}>
                            <h6 className="fs-5 ls-2">Ubicación</h6>
                            <p className="mb-0">
                                {headquarter?.cities?.name ? `${headquarter.cities.name}, ` : ''}
                                {headquarter?.cities?.states?.name || branch.countries?.name || '-'}
                            </p>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </Col>
    );
};

export default UnidadInfo;