import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
 
export async function middleware(req: any) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  
  if (!token && req.nextUrl.pathname !== '/auth/login' && req.nextUrl.pathname !== '/auth/signup') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}