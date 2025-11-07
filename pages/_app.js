// import node module libraries
import Head from 'next/head';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import SSRProvider from 'react-bootstrap/SSRProvider';
import { Analytics } from '@vercel/analytics/react';

// import theme style scss file
import 'styles/theme.scss';

// import default layouts
import DefaultDashboardLayout from 'layouts/DefaultDashboardLayout';
import { ActiveBranchProvider } from 'context/ActiveBranchContext';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const pageURL = process.env.baseURL + router.pathname;
  const title = "eiMai - Plataforma de Membresías";
  const description = "eiMai es una plataforma de gestión de membresías que permite a los usuarios crear, administrar y optimizar sus programas de membresía de manera eficiente.";
  const keywords = "eiMai, membresías, gestión de membresías, plataforma de membresías, administración de membresías";

  // Identify the layout, which will be applied conditionally
  const Layout = Component.Layout || (router.pathname.includes('dashboard') ? 
  (router.pathname.includes('instructor') || router.pathname.includes('student') ? 
  DefaultDashboardLayout : DefaultDashboardLayout) : DefaultDashboardLayout)
  
  return (
    <SSRProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content={keywords} />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </Head>
      <NextSeo
        title={title}
        description={description}
        canonical={pageURL}
        openGraph={{
          url: pageURL,
          title: title,
          description: description,
          site_name: process.env.siteName
        }}
      />
        <ActiveBranchProvider>
          <Layout>
            <Component {...pageProps} />
            <Analytics />
          </Layout>
        </ActiveBranchProvider>
    </SSRProvider>
  )
}

export default MyApp
