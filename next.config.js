/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  i18n: {
    locales: ['en', 'ur'],
    defaultLocale: 'en',
  },
}

module.exports = nextConfig
