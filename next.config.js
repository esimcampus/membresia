/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/_offline',
  },
});

const nextConfig = {
  reactStrictMode: true,
  // Si usas imágenes remotas, configura domains aquí
  images: {
    dangerouslyAllowSVG: true,
  },
};

module.exports = withPWA(nextConfig);
