import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

// --- Security Headers Helper ---
function addSecurityHeaders(response: NextResponse): void {
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

  const permissions = ['usb=()'];
  response.headers.set('Permissions-Policy', permissions.join(', '));

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

// --- Simplified OPTIONS handler with no CORS ---
function handleOptionsRequest(): NextResponse {
  const preflightResponse = new NextResponse(null, { status: 204 });

  // Prevent caching preflight responses
  preflightResponse.headers.set(
    'Cache-Control',
    'no-store, max-age=0, must-revalidate'
  );

  // Only add security headers, no CORS headers
  addSecurityHeaders(preflightResponse);
  return preflightResponse;
}

// --- Main Middleware Logic ---
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = req.nextUrl;

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  // Create response for standard requests
  const response = NextResponse.next();

  // Apply security headers
  addSecurityHeaders(response);

  // Authentication and authorization logic
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    console.error('[Middleware] CRITICAL: NEXTAUTH_SECRET is not set.');
    return response;
  }

  try {
    const token = await getToken({ req, secret: nextAuthSecret });

    // Handle team parameter for Google sign-in
    if (pathname === '/auth/signup') {
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
    if (pathname === '/dashboard' && token) {
      if (req.cookies.has('signup_team_id')) {
        response.cookies.delete({
          name: 'signup_team_id',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
        });
      }
    }

    // Define public routes that don't require authentication
    const publicPageAndApiRoutes = [
      '/auth/login',
      '/auth/signup',
      '/landing',
      '/blogs',
      '/jobs',
    ];
    const isNextAuthApiRoute = pathname.startsWith('/api/auth/');

    const isWebhookRoute = pathname.startsWith('/api/stripeWebhook') ||
      pathname.startsWith('/api/webhooks/stripe-connect');

    const isPublicRoute =
      isNextAuthApiRoute ||
      isWebhookRoute ||
      publicPageAndApiRoutes.includes(pathname) ||
      pathname.startsWith('/blogs/') ||
      pathname.startsWith('/jobs/') ||
      pathname.startsWith('/benchmark-arena') ||
      pathname.startsWith('/auth');

    // Redirect unauthenticated users to landing
    if (!token && !isPublicRoute) {
      const redirectResponse = NextResponse.redirect(
        new URL('/landing', req.url)
      );
      addSecurityHeaders(redirectResponse);
      return redirectResponse;
    }

    return response;
  } catch (error) {
    console.error('[Middleware] Authentication error:', error);
    // Fall back to treating as unauthenticated on error
    return response;
  }
}

// --- Middleware Configuration ---
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
