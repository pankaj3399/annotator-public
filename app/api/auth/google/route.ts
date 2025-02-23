import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import crypto from 'crypto';

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

    const now = Math.floor(Date.now() / 1000);
    const expires = now + (30 * 24 * 60 * 60); // 30 days

    // Create session token matching NextAuth's expected format
    const sessionToken = await encode({
      token: {
        name: user.name,
        email: user.email,
        picture: payload.picture || null,
        sub: user._id.toString(),
        role: user.role,
        iat: now,
        exp: expires,
        jti: crypto.randomUUID(),
        // Optional but recommended NextAuth fields
        aud: process.env.NEXTAUTH_URL,
        iss: process.env.NEXTAUTH_URL
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
          'Content-Type': 'application/json',
        }
      }
    );

    // Set the cookie exactly as NextAuth expects
    cookies().set({
      name: 'next-auth.session-token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expires * 1000)
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