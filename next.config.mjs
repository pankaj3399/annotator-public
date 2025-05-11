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
  
};

export default nextConfig;