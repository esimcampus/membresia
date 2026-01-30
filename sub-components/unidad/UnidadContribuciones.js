// import node module libraries
import React, { Fragment, useState, useEffect } from 'react';
import Link from 'next/link';
import { Col, Row, Card, Dropdown, Image, Button, Badge, Spinner } from 'react-bootstrap';
import { MoreVertical } from 'react-feather';
import { useRouter } from 'next/router';
import { supabase } from 'lib/supabaseClient';

// import custom components
import AnnexFormModal from './AnnexFormModal';

const UnidadContribuciones = () => {
	const [annexes, setAnnexes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [selectedAnnex, setSelectedAnnex] = useState(null);
	const router = useRouter();
	const { id } = router.query;

	useEffect(() => {
		if (id) {
			loadAnnexes();
		}
	}, [id]);

	const loadAnnexes = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('annexes')
				.select(`
					annex_id,
					name,
					address,
					is_headquarters,
					description,
					phone,
					email,
					city_id,
					cities (
                        name,
                        zip_code
                ),
                    members (
                        member_id,
                        first_name,
                        last_name,
                        avatar_url
                    )
				`)
				.eq('branch_id', id)
				.eq('is_active', true)
				.order('is_headquarters', { ascending: false })
				.order('name');

			if (error) throw error;
			
			console.log('Anexos cargados:', data);
			setAnnexes(data || []);
		} catch (error) {
			console.error('Error loading annexes:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateAnnex = () => {
		setSelectedAnnex(null);
		setShowModal(true);
	};

	const handleEditAnnex = (annex) => {
		setSelectedAnnex(annex);
		setShowModal(true);
	};

	const handleModalClose = () => {
		setShowModal(false);
		setSelectedAnnex(null);
	};

	const handleSave = () => {
		loadAnnexes();
	};

    const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
        <Link
            href=""
            ref={ref}
            onClick={(e) => {
                e.preventDefault();
                onClick(e);
            }}
            className="text-muted text-primary-hover">
            {children}
        </Link>
    ));

    CustomToggle.displayName = 'Alternar';

    const ActionMenu = () => {
        return (
            <Dropdown>
                <Dropdown.Toggle as={CustomToggle}>
                    <MoreVertical size="15px" className="text-muted" />
                </Dropdown.Toggle>
                <Dropdown.Menu align={'end'}>
                    <Dropdown.Item eventKey="1">
                        Ver detalles
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="2">
                        Nueva contribución
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="3">
                        Otra acción
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        );
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

    return (
        <Col xl={6} lg={12} md={12} xs={12} className="mb-6">
            <Card>
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <Card.Title as="h4">Anexos</Card.Title>
                        <Button 
                            variant="primary" 
                            size="sm"
                            onClick={handleCreateAnnex}
                            className="d-flex align-items-center gap-1"
                        >
                            <i className="fe fe-plus"></i> Nuevo
                        </Button>
                    </div>
                    
                    {annexes.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="fe fe-map-pin" style={{ fontSize: '48px', opacity: 0.3 }}></i>
                            <p className="mt-3 text-muted">
                                No hay anexos registrados. Haga clic en "Nuevo Anexo" para agregar uno.
                            </p>
                        </div>
                    ) : (
                        annexes.map((item, index) => (
                            <div 
                                key={index} 
                                className={`${index > 0 ? 'border-top pt-4 mt-4' : ''}`}
                            >
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fe fe-map-pin text-primary" style={{ fontSize: '20px' }}></i>
                                        <div>
                                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                                {item.name}
                                                {item.is_headquarters && (
                                                    <Badge bg="success">Sede Principal</Badge>
                                                )}
                                            </h5>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditAnnex(item)}
                                        className="btn-icon"
                                        title="Editar anexo"
                                    >
                                        <i className="fe fe-edit text-primary" style={{ fontSize: '16px' }}></i>
                                    </Button>
                                </div>
                                
                                {item.description && (
                                    <p className="text-muted mb-2">{item.description}</p>
                                )}
                                
                                {item.address && (
                                    <p className="mb-1">
                                        <i className="fe fe-home me-2"></i>
                                        {item.address}
                                        {item.cities && item.cities.name && `, ${item.cities.name}`}
                                        {item.cities && item.cities.zip_code && ` (${item.cities.zip_code})`}
                                    </p>
                                )}
                                
                                {item.phone && (
                                    <p className="mb-1">
                                        <i className="fe fe-phone me-2"></i>
                                        {item.phone}
                                    </p>
                                )}
                                
                                {item.email && (
                                    <p className="mb-3">
                                        <i className="fe fe-mail me-2"></i>
                                        {item.email}
                                    </p>
                                )}

                                {item.members && item.members.length > 0 && (
                                    <div className="d-flex align-items-center mt-3">
                                        <i className="fe fe-users me-2 text-muted"></i>
                                        <span className="text-muted fs-6">
                                            {item.members.length} {item.members.length === 1 ? 'miembro' : 'miembros'}
                                        </span>
                                    </div>
                                )}
                                
                                {(!item.members || item.members.length === 0) && (
                                    <div className="mt-3">
                                        <i className="fe fe-users me-2 text-muted"></i>
                                        <span className="text-muted">Sin miembros asignados</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </Card.Body>
            </Card>

            <AnnexFormModal
                show={showModal}
                onHide={handleModalClose}
                branchId={id}
                annexData={selectedAnnex}
                onSave={handleSave}
            />
        </Col>
    );
};

export default UnidadContribuciones;
