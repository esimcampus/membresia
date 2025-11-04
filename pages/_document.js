import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* PWA primary meta tags */}
        <meta name="application-name" content="eiMai" />
        <meta name="theme-color" content="#624bff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="eiMai" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/images/brand/logo/icon-192.png" sizes="192x192" />
        <link rel="icon" href="/images/brand/logo/icon-512.png" sizes="512x512" />
        {/* iOS PWA icon (fallback to 192x192 if 180x180 not available) */}
        <link rel="apple-touch-icon" href="/images/brand/logo/icon-192.png" />
        {/* Splash/background color for iOS */}
        <meta name="background-color" content="#ffffff" />
      </Head>
      <body className='bg-light'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
