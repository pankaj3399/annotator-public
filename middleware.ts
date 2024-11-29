import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const publicRoutes = ["/auth/login", "/auth/signup", "/landing"];
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
