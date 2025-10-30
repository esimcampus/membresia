// import node module libraries
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from 'lib/supabaseClient';

// import sub components
import NavbarVertical from './navbars/NavbarVertical';
import NavbarTop from './navbars/NavbarTop';
import { Row, Col } from 'react-bootstrap';

const DefaultDashboardLayout = (props) => {
	const [showMenu, setShowMenu] = useState(true);
	const [checked, setChecked] = useState(false);
	const router = useRouter();

	useEffect(() => {
		let mounted = true;
		const checkSession = async () => {
			const { data } = await supabase.auth.getSession();
			if (!data?.session) {
				router.replace('/authentication/sign-in');
			}
			if (mounted) setChecked(true);
		};
		checkSession();
		const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) {
				router.replace('/authentication/sign-in');
			}
		});
		return () => {
			mounted = false;
			sub?.subscription?.unsubscribe?.();
		};
	}, [router]);
	const ToggleMenu = () => {
		return setShowMenu(!showMenu);
	};	
	if (!checked) return null;
	return (		
		<div id="db-wrapper" className={`${showMenu ? '' : 'toggled'}`}>
			<div className="navbar-vertical navbar">
				<NavbarVertical
					showMenu={showMenu}
					onClick={(value) => setShowMenu(value)}
				/>
			</div>
			<div id="page-content">
				<div className="header">
					<NavbarTop
						data={{
							showMenu: showMenu,
							SidebarToggleMenu: ToggleMenu
						}}
					/>
				</div>
				{props.children}
				<div className='px-6 border-top py-3'>
					<Row>
						<Col sm={6} className='text-center text-sm-start mb-2 mb-sm-0'>
							<p className='m-0'>Desarrollado para Mawee</p></Col>
						<Col sm={6} className='text-center text-sm-end'>
							{/* <p className='m-0'>Destributed by <a href='https://themewagon.com/' target='_blank'>ThemeWagon</a></p> */}
						</Col>
					</Row>
				</div>
			</div>
		</div>
	);
};
export default DefaultDashboardLayout;
