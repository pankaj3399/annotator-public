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
        source: '/api/upload/:path',
        destination: '/api/upload/:path',
      }
    ];
  },

  async headers() {
    // Define the same allowed origins as in middleware
    const ALLOWED_ORIGINS = [
      'https://www.blolabel.ai',
      'https://annotator-public-amber.vercel.app',
      'https://annotator-public.vercel.app',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
    ];

    // Create headers for each allowed origin
    return ALLOWED_ORIGINS.map(origin => ({
      source: '/(.*)',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: origin,
        },
        {
          key: 'Access-Control-Allow-Credentials',
          value: 'true',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
        },
      ],
    }));
  },
};

export default nextConfig;