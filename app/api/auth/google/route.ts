import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Missing Google ID token" },
        { status: 400 }
      );
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name,
        email,
        password: `GOOGLE_${Date.now()}`,
        role: "annotator",
        lastLogin: new Date()
      });
      await user.save();
    }

    // Create session token
    const sessionToken = await encode({
      token: {
        email: user.email,
        name: user.name,
        sub: user._id.toString(),
        role: user.role
      },
      secret: process.env.NEXTAUTH_SECRET!
    });

    // Create the response object
    const response = new NextResponse(
      JSON.stringify({
        ok: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }),
      {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, must-revalidate',
          'x-powered-by': 'Next.js',
          'vary': 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding'
        }
      }
    );

    // Set the cookie using proper cookie handling
    cookies().set({
      name: 'next-auth.session-token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return response;

  } catch (error: any) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error.message
      },
      { status: 500 }
    );
  }
}