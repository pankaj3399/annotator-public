// app/api/auth/google/route.ts
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { token } = await req.json();
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const { name, email, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Update last login for existing user
      user = await User.findByIdAndUpdate(
        user._id,
        { 
          lastLogin: new Date(),
          googleId // Store Google ID if not already stored
        },
        { new: true }
      );
    } else {
      // Create new user
      const userData = {
        name,
        email,
        googleId,
        password: `GOOGLE_${googleId}`, // Placeholder for schema requirement
        role: "annotator",
        domain: [],
        lang: [],
        location: null,
        permission: [],
        lastLogin: new Date(),
      };

      user = new User(userData);
      await user.save();
    }

    return NextResponse.json({
        csrfToken: "CSRF_TOKEN_HERE", // Added csrfToken field
        user: {
          value: { // Nested user object under value
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            domain: user.domain,
            lang: user.lang,
            location: user.location,
            permission: user.permission,
            lastLogin: user.lastLogin.toISOString()
          }
        }
      });

  } catch (error: any) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Token verification failed",
        details: error.message
      },
      { status: 500 }
    );
  }
}