import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  return {
    rules: [
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
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}