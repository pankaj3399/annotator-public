// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// --- CORS Configuration ---
const ALLOWED_ORIGINS = new Set(
  process.env.NODE_ENV === 'production'
    ? [
      'https://www.blolabel.ai',
    ]
    : [
      'http://localhost:3000',
      'https://www.blolabel.ai',
      'https://annotator-public-amber.vercel.app',
      'https://annotator-public.vercel.app',
    ].filter(Boolean) as string[]
);

// --- Security Headers Helper ---
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer');

  const permissions = [
    'geolocation=()', 'microphone=()', 'camera=()', 'payment=()', 'usb=()',
  ];
  response.headers.set('Permissions-Policy', permissions.join(', '));

  let cspDirectives = [
    "default-src 'self'",
    "script-src 'self'" +
      (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : "") +
      " 'unsafe-inline'" + // Allows inline scripts (needed for Next.js/React hydration/dev)
      " https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // 'unsafe-inline' for styles
    "img-src 'self' data: https: *.blolabel.ai",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com",
    "frame-src 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

// --- CORS Headers Helper ---
function applyCorsHeaders(response: NextResponse, requestOrigin: string | null) {
  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

// --- Main Middleware Logic ---
export async function middleware(req: NextRequest) {
  const requestOrigin = req.headers.get('Origin');
  const { pathname, searchParams } = req.nextUrl;

  if (req.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', requestOrigin);
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
      preflightResponse.headers.set('Access-Control-Max-Age', '86400');
    }
    addSecurityHeaders(preflightResponse);
    return preflightResponse;
  }

  const response = NextResponse.next();
  applyCorsHeaders(response, requestOrigin);
  addSecurityHeaders(response);

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    console.error("[Middleware] CRITICAL: NEXTAUTH_SECRET is not set.");
    return response;
  }
  const token = await getToken({ req, secret: nextAuthSecret });

  if (pathname === "/auth/signup") {
    const teamParam = searchParams.get('team');
    if (teamParam) {
      response.cookies.set('signup_team_id', teamParam, {
        path: '/', maxAge: 600, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  if (pathname.startsWith('/api/auth/callback/google')) {
    const teamParam = searchParams.get('team');
    if (teamParam) {
      response.cookies.set('signup_team_id', teamParam, {
        path: '/', maxAge: 600, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  if (pathname === "/dashboard" && token) {
    if (req.cookies.has('signup_team_id')) {
      response.cookies.delete({ name: 'signup_team_id', path: '/', secure: process.env.NODE_ENV === 'production' });
    }
  }

  const publicPageAndApiRoutes = ["/auth/login", "/auth/signup", "/landing", "/blogs", "/jobs"];
  const isNextAuthApiRoute = pathname.startsWith('/api/auth/');
  const isPublicRoute =
    isNextAuthApiRoute ||
    publicPageAndApiRoutes.includes(pathname) ||
    pathname.startsWith("/blogs/") ||
    pathname.startsWith("/jobs/") ||
    pathname.startsWith("/benchmark-arena") ||
    pathname.startsWith("/auth");

  if (!token && !isPublicRoute) {
    const redirectResponse = NextResponse.redirect(new URL("/landing", req.url));
    addSecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  return response;
}

// --- Middleware Configuration ---
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};