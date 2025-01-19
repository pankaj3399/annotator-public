/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000/',
  generateRobotsTxt: true,
  exclude: ['*'],  // Exclude everything by default
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: ['/', 'blogs', 'blogs/*'],
        disallow: ['*']  // Disallow everything else
      },
    ],
  },
  additionalPaths: async (config) => {
    const result = []
    
    // Add homepage
    result.push({
      loc: '/',
      changefreq: 'daily',
      priority: 1,
      lastmod: new Date().toISOString(),
    })

    // Add blogs page
    result.push({
      loc: 'blogs',
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    })

    return result
  }
}