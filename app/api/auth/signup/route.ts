import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import saltAndHashPassword from "@/utils/password";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const {
      name,
      email,
      password,
      role,
      phone = null,
      domain = [],
      lang = [],
      location = null,
      linkedin,  // Add these optional fields
      resume, // to capture them from the request
      nda  // if they are provided
    } = await req.json();

    // console.log("request body", await req.json());

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "Name, email, password, and role are required",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: "Invalid email format",
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        {
          error: "User already exists",
          message: "An account with this email already exists",
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = saltAndHashPassword(password);

    // Define user data with all fields
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      domain: Array.isArray(domain) ? domain : [],
      lang: Array.isArray(lang) ? lang : [],
      location,
      linkedin, // Include these fields in userData
      resume, // They will be null by default
      nda, // if not provided in the request
      permission: [],
      lastLogin: new Date(),
      invitation: null,
    };

    // Create new user using the model
    const newUser = new User(userData);
    await newUser.save();

    // Return success response without sensitive data
    return NextResponse.json(
      {
        message: "User created successfully",
        userId: newUser._id,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          domain: newUser.domain,
          lang: newUser.lang,
          location: newUser.location,
          phone: newUser.phone,
          linkedin: newUser.linkedin,
          resume: newUser.resume,
          nda: newUser.nda,
          permission: newUser.permission,
          lastLogin: newUser.lastLogin,
          created_at: newUser.created_at,
          updated_at: newUser.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);

    if (error.name === "ValidationError") {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: Object.values(error.errors).map((err: any) => err.message),
        },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        {
          error: "Duplicate Error",
          message: "This email is already registered",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Server Error",
        message: "Something went wrong during signup",
      },
      { status: 500 }
    );
  }
}
