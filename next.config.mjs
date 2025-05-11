// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  images: {
    domains: ['via.placeholder.com', 'cdn.sanity.io', 'annotator-public.s3.ap-south-1.amazonaws.com'],
  },

  experimental: {
    serverActions: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/upload/:path*',
        destination: '/api/upload/:path*',
      }
    ];
  },

  async headers() {
    const defaultAllowedOrigin = process.env.NODE_ENV === 'production'
      ? 'https://www.blolabel.ai'
      : 'http://localhost:3000';

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: defaultAllowedOrigin,
          },
        ],
      },
    ];
  },
};


export default nextConfig;