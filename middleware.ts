import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
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
      const response = NextResponse.next();
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
      const response = NextResponse.next();
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
      const response = NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};