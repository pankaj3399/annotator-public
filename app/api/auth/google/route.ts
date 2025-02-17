import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const {
      role = "annotator",
      phone = "",
      domain = [""],
      lang = [""],
      location = "",
      linkedIn = "",
      resume = "",
      nda = "",
      redirect = false,
      json = true,
      token // Google ID token
    } = body;
    
    const callbackUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Verify token is present
    if (!token) {
      return NextResponse.json(
        { error: "Missing Google ID token" },
        { status: 400 }
      );
    }

    // Verify Google token
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

    // Extract user info from token payload
    const email = payload.email;
    // Handle different name fields from Google payload
    const name = payload.name || 
                 (payload.given_name && payload.family_name ? 
                  `${payload.given_name} ${payload.family_name}` : 
                  payload.given_name || 
                  email.split('@')[0]); // Fallback to email username if no name is provided

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update last login for existing user
      user = await User.findByIdAndUpdate(
        user._id,
        {
          lastLogin: new Date(),
          name,
          role,
          phone,
          domain,
          lang,
          location,
          linkedIn,
          resume,
          nda
        },
        { new: true }
      );
    } else {
      // Create new user
      const userData = {
        name,
        email,
        password: `GOOGLE_${Date.now()}`, // Placeholder password
        role,
        phone,
        domain,
        lang,
        location,
        linkedIn,
        resume,
        nda,
        permission: [],
        lastLogin: new Date(),
      };

      user = new User(userData);
      await user.save();
    }

    // Return response
    return NextResponse.json({
      ok: true,
      user: {
        _id: user._id,
      }
    });

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