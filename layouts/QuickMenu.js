// import node module libraries
import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import {
    Row,
    Col,
    Image,
    Dropdown,
    ListGroup,
} from 'react-bootstrap';

// simple bar scrolling used for notification item scrolling
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';

// import data files
import NotificationList from 'data/Notification';

// import hooks
import useMounted from 'hooks/useMounted';
import { supabase } from 'lib/supabaseClient';
import { useRouter } from 'next/router';

const QuickMenu = () => {
    const router = useRouter();
    const hasMounted = useMounted();
    const [currentUser, setCurrentUser] = useState(null);
    
    const isDesktop = useMediaQuery({
        query: '(min-width: 1224px)'
    })

    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: systemUser } = await supabase
                .from('system_users')
                .select(`
                    member_id,
                    members (
                        member_id,
                        first_name,
                        last_name,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id)
                .single();

            if (systemUser?.members) {
                setCurrentUser({
                    member_id: systemUser.members.member_id,
                    first_name: systemUser.members.first_name,
                    last_name: systemUser.members.last_name,
                    avatar_url: systemUser.members.avatar_url,
                    email: user.email
                });
            }
        } catch (error) {
            console.error('Error cargando usuario:', error);
        }
    };

    const getInitials = (firstName, lastName) => {
        const first = firstName?.charAt(0) || '';
        const last = lastName?.charAt(0) || '';
        return (first + last).toUpperCase();
    };

    const Notifications = () => {
        return (
            <SimpleBar style={{ maxHeight: '300px' }}>
                <ListGroup variant="flush">
                    {NotificationList.map(function (item, index) {
                        return (
                            <ListGroup.Item className={index === 0 ? 'bg-light' : ''} key={index}>
                                <Row>
                                    <Col>
                                        <Link href="#" className="text-muted">
                                            <h5 className=" mb-1">{item.sender}</h5>
                                            <p className="mb-0"> {item.message}</p>
                                        </Link>
                                    </Col>
                                </Row>
                            </ListGroup.Item>
                        );
                    })}
                </ListGroup>
            </SimpleBar>
        );
    }

    const QuickMenuDesktop = () => {
        return (
        <ListGroup as="ul" bsPrefix='navbar-nav' className="navbar-right-wrap ms-auto d-flex nav-top-wrap">
            {/* Notificaciones ocultas */}
            {/* <Dropdown as="li" className="stopevent">
                <Dropdown.Toggle as="a"
                    bsPrefix=' '
                    id="dropdownNotification"
                    className="btn btn-light btn-icon rounded-circle indicator indicator-primary text-muted">
                    <i className="fe fe-bell"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu
                    className="dashboard-dropdown notifications-dropdown dropdown-menu-lg dropdown-menu-end py-0"
                    aria-labelledby="dropdownNotification"
                    align="end"
                    show
                    >
                    <Dropdown.Item className="mt-3" bsPrefix=' ' as="div"  >
                        <div className="border-bottom px-3 pt-0 pb-3 d-flex justify-content-between align-items-end">
                            <span className="h4 mb-0">Notifications</span>
                            <Link href="/" className="text-muted">
                                <span className="align-middle">
                                    <i className="fe fe-settings me-1"></i>
                                </span>
                            </Link>
                        </div>
                        <Notifications />
                        <div className="border-top px-3 pt-3 pb-3">
                            <Link href="/dashboard/notification-history" className="text-link fw-semi-bold">
                                See all Notifications
                            </Link>
                        </div>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown> */}
            <Dropdown as="li">
                <Dropdown.Toggle
                    as="a"
                    bsPrefix=' '
                    className="rounded-circle"
                    id="dropdownUser">
                    <div className="avatar avatar-md avatar-indicators avatar-online">
                        {currentUser?.avatar_url ? (
                            <Image alt="avatar" src={currentUser.avatar_url} className="rounded-circle" />
                        ) : (
                            <div className="avatar-initials rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                {currentUser ? getInitials(currentUser.first_name, currentUser.last_name) : 'U'}
                            </div>
                        )}
                    </div>
                </Dropdown.Toggle>
                <Dropdown.Menu
                    className="dropdown-menu dropdown-menu-end "
                    align="end"
                    aria-labelledby="dropdownUser"
                    show
                    >
                    <Dropdown.Item as="div" className="px-4 pb-0 pt-2" bsPrefix=' '>
                            <div className="lh-1 ">
                                <h5 className="mb-1">
                                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Usuario'}
                                </h5>
                                <Link href="#" className="text-inherit fs-6">{currentUser?.email || ''}</Link>
                            </div>
                            <div className=" dropdown-divider mt-3 mb-2"></div>
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => currentUser && router.push(`/pages/editar-miembro?id=${currentUser.member_id}`)}>
                        <i className="fe fe-user me-2"></i> Editar Perfil
                    </Dropdown.Item>
                    {/* <Dropdown.Item eventKey="3">
                        <i className="fe fe-activity me-2"></i> Actividad
                    </Dropdown.Item>
                    <Dropdown.Item className="text-primary">
                        <i className="fe fe-star me-2"></i> Go Pro
                    </Dropdown.Item>
                    <Dropdown.Item >
                        <i className="fe fe-settings me-2"></i> Account Settings
                    </Dropdown.Item> */}
                    <Dropdown.Item onClick={async () => { await supabase.auth.signOut(); router.replace('/authentication/sign-in'); }}>
                        <i className="fe fe-power me-2"></i>Cerrar Sesión
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </ListGroup>
    )}

    const QuickMenuMobile = () => {
        return (
        <ListGroup as="ul" bsPrefix='navbar-nav' className="navbar-right-wrap ms-auto d-flex nav-top-wrap">
            {/* Notificaciones ocultas */}
            {/* <Dropdown as="li" className="stopevent">
                <Dropdown.Toggle as="a"
                    bsPrefix=' '
                    id="dropdownNotification"
                    className="btn btn-light btn-icon rounded-circle indicator indicator-primary text-muted">
                    <i className="fe fe-bell"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu
                    className="dashboard-dropdown notifications-dropdown dropdown-menu-lg dropdown-menu-end py-0"
                    aria-labelledby="dropdownNotification"
                    align="end"
                    >
                    <Dropdown.Item className="mt-3" bsPrefix=' ' as="div"  >
                        <div className="border-bottom px-3 pt-0 pb-3 d-flex justify-content-between align-items-end">
                            <span className="h4 mb-0">Notifications</span>
                            <Link href="/" className="text-muted">
                                <span className="align-middle">
                                    <i className="fe fe-settings me-1"></i>
                                </span>
                            </Link>
                        </div>
                        <Notifications />
                        <div className="border-top px-3 pt-3 pb-3">
                            <Link href="/dashboard/notification-history" className="text-link fw-semi-bold">
                                See all Notifications
                            </Link>
                        </div>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown> */}
            <Dropdown as="li">
                <Dropdown.Toggle
                    as="a"
                    bsPrefix=' '
                    className="rounded-circle"
                    id="dropdownUser">
                    <div className="avatar avatar-md avatar-indicators avatar-online">
                        {currentUser?.avatar_url ? (
                            <Image alt="avatar" src={currentUser.avatar_url} className="rounded-circle" />
                        ) : (
                            <div className="avatar-initials rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                {currentUser ? getInitials(currentUser.first_name, currentUser.last_name) : 'U'}
                            </div>
                        )}
                    </div>
                </Dropdown.Toggle>
                <Dropdown.Menu
                    className="dropdown-menu dropdown-menu-end "
                    align="end"
                    aria-labelledby="dropdownUser"
                    >
                    <Dropdown.Item as="div" className="px-4 pb-0 pt-2" bsPrefix=' '>
                            <div className="lh-1 ">
                                <h5 className="mb-1">
                                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Usuario'}
                                </h5>
                                <Link href="#" className="text-inherit fs-6">{currentUser?.email || ''}</Link>
                            </div>
                            <div className=" dropdown-divider mt-3 mb-2"></div>
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => currentUser && router.push(`/pages/editar-miembro?id=${currentUser.member_id}`)}>
                        <i className="fe fe-user me-2"></i> Editar Perfil
                    </Dropdown.Item>
                    {/* <Dropdown.Item eventKey="3">
                        <i className="fe fe-activity me-2"></i> Actividad
                    </Dropdown.Item>
                    <Dropdown.Item className="text-primary">
                        <i className="fe fe-star me-2"></i> Go Pro
                    </Dropdown.Item>
                    <Dropdown.Item >
                        <i className="fe fe-settings me-2"></i> Account Settings
                    </Dropdown.Item> */}
                    <Dropdown.Item onClick={async () => { await supabase.auth.signOut(); router.replace('/authentication/sign-in'); }}>
                        <i className="fe fe-power me-2"></i>Cerrar Sesión
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </ListGroup>
    )}

    return (
        <Fragment>
            { hasMounted && isDesktop ? <QuickMenuDesktop /> : <QuickMenuMobile />}
        </Fragment>
    )
}

export default QuickMenu;