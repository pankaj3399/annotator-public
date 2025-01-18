/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  generateRobotsTxt: true,
  exclude: [
    '/api/*',
    '/auth/*',
    '/dashboard/*',
    '/admin/*',
    '/(manager)/**',
    '/(annotator)/**',
    '/profile/*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
        ],
        disallow: [
          '/api/*',
          '/auth/*',
          '/dashboard/*',
          '/admin/*',
          '/(manager)/*',
          '/(annotator)/*',
          '/profile/*',
          '/*.json$',
        ],
      },
    ],
  },
}