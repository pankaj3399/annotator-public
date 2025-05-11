import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// --- CORS Configuration ---
const ALLOWED_ORIGINS = new Set([
  'https://www.blolabel.ai',
  'https://annotator-public-amber.vercel.app',
  'https://annotator-public.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
]);

// --- Security Headers Helper ---
function addSecurityHeaders(response: NextResponse) {
  // Delete any existing security headers first to prevent conflicts
  response.headers.delete('Content-Security-Policy');
  response.headers.delete('X-Content-Type-Options');
  response.headers.delete('X-Frame-Options');
  response.headers.delete('X-XSS-Protection');
  response.headers.delete('Referrer-Policy');
  response.headers.delete('Permissions-Policy');
  response.headers.delete('Strict-Transport-Security');
  
  // Now set our own headers
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
  // CRITICAL: First delete any existing CORS headers to prevent conflicts
  response.headers.delete('Access-Control-Allow-Origin');
  response.headers.delete('Access-Control-Allow-Methods');
  response.headers.delete('Access-Control-Allow-Headers');
  response.headers.delete('Access-Control-Allow-Credentials');
  response.headers.delete('Access-Control-Max-Age');
  
  // Only add CORS headers if the origin is in our allowed list
  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development' && requestOrigin) {
    // Special case for development - still validate but be more lenient
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  // Deliberately NOT setting a wildcard - if origin is not allowed, no CORS headers
}

// --- Main Middleware Logic ---
export async function middleware(req: NextRequest) {
  const requestOrigin = req.headers.get('Origin');
  const { pathname, searchParams } = req.nextUrl;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', requestOrigin);
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
      preflightResponse.headers.set('Access-Control-Max-Age', '86400');
    } else if (process.env.NODE_ENV === 'development' && requestOrigin) {
      // More lenient in development
      preflightResponse.headers.set('Access-Control-Allow-Origin', requestOrigin);
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
      preflightResponse.headers.set('Access-Control-Max-Age', '86400');
    }
    addSecurityHeaders(preflightResponse);
    return preflightResponse;
  }

  // Standard request handling
  const response = NextResponse.next();
  
  // Apply security and CORS headers
  applyCorsHeaders(response, requestOrigin);
  addSecurityHeaders(response);

  // Authentication and authorization logic
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    console.error("[Middleware] CRITICAL: NEXTAUTH_SECRET is not set.");
    return response;
  }
  const token = await getToken({ req, secret: nextAuthSecret });

  // Handle team parameter for Google sign-in
  if (pathname === "/auth/signup") {
    const teamParam = searchParams.get('team');
    if (teamParam) {
      response.cookies.set('signup_team_id', teamParam, {
        path: '/', 
        maxAge: 600, 
        httpOnly: true, 
        sameSite: 'lax', 
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  // Check for Google callback
  if (pathname.startsWith('/api/auth/callback/google')) {
    const teamParam = searchParams.get('team');
    if (teamParam) {
      response.cookies.set('signup_team_id', teamParam, {
        path: '/', 
        maxAge: 600, 
        httpOnly: true, 
        sameSite: 'lax', 
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  // Clear team cookie after successful authentication
  if (pathname === "/dashboard" && token) {
    if (req.cookies.has('signup_team_id')) {
      response.cookies.delete({ 
        name: 'signup_team_id', 
        path: '/', 
        secure: process.env.NODE_ENV === 'production' 
      });
    }
  }

  // Public routes that don't require authentication
  const publicPageAndApiRoutes = ["/auth/login", "/auth/signup", "/landing", "/blogs", "/jobs"];
  const isNextAuthApiRoute = pathname.startsWith('/api/auth/');
  
  const isPublicRoute =
    isNextAuthApiRoute ||
    publicPageAndApiRoutes.includes(pathname) ||
    pathname.startsWith("/blogs/") ||
    pathname.startsWith("/jobs/") ||
    pathname.startsWith("/benchmark-arena") ||
    pathname.startsWith("/auth");

  // Redirect unauthenticated users to landing
  if (!token && !isPublicRoute) {
    const redirectResponse = NextResponse.redirect(new URL("/landing", req.url));
    addSecurityHeaders(redirectResponse);
    applyCorsHeaders(redirectResponse, requestOrigin);
    return redirectResponse;
  }

  return response;
}

// --- Middleware Configuration ---
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};