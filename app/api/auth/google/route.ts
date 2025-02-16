// app/api/auth/google/route.ts
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    console.log("Database connected successfully");

    const { name, email } = await req.json();
    console.log("Received data:", { name, email });

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Update last login for existing user
      user = await User.findByIdAndUpdate(
        user._id,
        { lastLogin: new Date() },
        { new: true }
      );
    } else {
      // For Google auth users, set a placeholder password since it's required by schema
      // You might want to update your User model to make password optional for OAuth users
      const userData = {
        name,
        email,
        password: "GOOGLE_AUTH_" + Date.now(), // Placeholder password
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

    return NextResponse.json(
      {
        message: user ? "Login successful" : "User created successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          domain: user.domain,
          lang: user.lang,
          location: user.location,
          permission: user.permission,
          lastLogin: user.lastLogin,
        },
      },
      { status: user ? 200 : 201 }
    );

  } catch (error: any) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Something went wrong during Google authentication",
        details: error.message
      },
      { status: 500 }
    );
  }
}