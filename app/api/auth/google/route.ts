// app/api/auth/google/route.ts
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    // Parse request body to match login API structure
    const body = await req.json();
    const {
      email,
      name,
      role = "annotator",
      phone = "",
      domain = [""],
      lang = [""],
      location = "",
      linkedIn = "",
      resume = "",
      nda = "",
      csrfToken,
      callbackUrl,
      redirect = false,
      json = true,
      token // Google ID token
    } = body;

    // Verify the request has required fields
    if (!email || !name || !csrfToken || !token) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify Google token
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

    // Match login API response structure
    return NextResponse.json({
      ok: true,
      csrfToken,
      url: redirect ? callbackUrl : null,
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