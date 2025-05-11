import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Define allowed origins list
const allowedOrigins = [
  'https://annotator-public-amber.vercel.app',
  'https://annotator-public.vercel.app',
  'https://www.blolabel.ai'
];

export async function middleware(req: NextRequest) {
  // Get the origin from request headers
  const origin = req.headers.get('origin');
  
  // Handle CORS before doing anything else
  // Create response to modify
  const response = NextResponse.next();
  
  // Only set specific origin if it's in our allowlist
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow localhost in development
    response.headers.set('Access-Control-Allow-Origin', origin || '');
  } else {
    // No wildcard - remove existing header if present
    response.headers.delete('Access-Control-Allow-Origin');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  
  // Original middleware code continues below
  console.log("Middleware running for path:", req.nextUrl.pathname);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const pathname = req.nextUrl.pathname;

  // Handle storing team parameter for Google sign-in
  if (pathname === "/auth/signup") {
    console.log("Processing signup route");
    const teamParam = req.nextUrl.searchParams.get('team');
    console.log("Team parameter in URL:", teamParam);
    
    if (teamParam) {
      console.log("Setting team cookie:", teamParam);
      // Store the team parameter in a cookie
      response.cookies.set('signup_team_id', teamParam, { 
        path: '/',
        maxAge: 600, // 10 minutes
        httpOnly: true,
        sameSite: 'lax',
      });
      return response;
    }
  }

  // Check for Google callback
  if (pathname.startsWith('/api/auth/callback/google')) {
    console.log("Processing Google callback");
    // Check for team parameter in URL
    const teamParam = req.nextUrl.searchParams.get('team');
    console.log("Team parameter in Google callback URL:", teamParam);
    
    if (teamParam) {
      console.log("Setting team cookie from callback:", teamParam);
      response.cookies.set('signup_team_id', teamParam, { 
        path: '/',
        maxAge: 600,
        httpOnly: true,
        sameSite: 'lax',
      });
      return response;
    }
  }
  
  // Clear the team cookie after successful authentication
  if (pathname === "/dashboard" && token) {
    console.log("User redirected to dashboard, checking for team cookie");
    
    if (req.cookies.has('signup_team_id')) {
      console.log("Clearing team cookie after successful authentication");
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
    console.log("Redirecting unauthenticated user to landing page");
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};