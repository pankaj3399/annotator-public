import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Define allowed origins list
const allowedOrigins = [
  'https://annotator-public-amber.vercel.app',
  'https://annotator-public.vercel.app',
  'https://www.blolabel.ai'
];

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const response = NextResponse.next();
  
  // Override any existing CORS headers
  // CRITICAL: Remove wildcard CORS header if present
  response.headers.delete('Access-Control-Allow-Origin');
  
  // Set specific origin if in allowlist
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow localhost origin
    response.headers.set('Access-Control-Allow-Origin', origin || '');
  }
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }
  
  // Continue with original middleware logic
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const pathname = req.nextUrl.pathname;

  // Handle team parameter for Google sign-in
  if (pathname === "/auth/signup") {
    const teamParam = req.nextUrl.searchParams.get('team');
    if (teamParam) {
      response.cookies.set('signup_team_id', teamParam, { 
        path: '/',
        maxAge: 600, 
        httpOnly: true,
        sameSite: 'lax',
      });
      return response;
    }
  }

  // Check for Google callback
  if (pathname.startsWith('/api/auth/callback/google')) {
    const teamParam = req.nextUrl.searchParams.get('team');
    if (teamParam) {
      response.cookies.set('signup_team_id', teamParam, { 
        path: '/',
        maxAge: 600,
        httpOnly: true,
        sameSite: 'lax',
      });
      return response;
    }
  }
  
  // Clear team cookie after authentication
  if (pathname === "/dashboard" && token) {
    if (req.cookies.has('signup_team_id')) {
      response.cookies.delete('signup_team_id');
      return response;
    }
  }

  const publicRoutes = [
    "/auth/login",
    "/auth/signup",
    "/landing",
    "/blogs",
    "/jobs",
  ];
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/blogs/") ||
    pathname.startsWith("/jobs/") ||
    pathname.startsWith("/benchmark-arena") ||
    pathname.startsWith("/auth");

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  return response;
}

export const config = {
  // Ensure it runs on all routes, not just API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};