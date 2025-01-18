// app/server-sitemap.xml/route.ts
import { getServerSideSitemap } from 'next-sitemap';

export async function GET(request: Request) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const entries = [
      {
        loc: baseUrl,
        lastmod: new Date().toISOString(),
        changefreq: 'daily' as const,
        priority: 1,
      },
      {
        loc: `${baseUrl}/about`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly' as const,
        priority: 0.8,
      },
    ];

    // Get the sitemap content
    const sitemapResponse = await getServerSideSitemap(entries);
    const sitemapContent = await sitemapResponse.text();
    
    return new Response(sitemapContent, {
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      'Error generating sitemap',
      { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }
}