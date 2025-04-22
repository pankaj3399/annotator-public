import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Team } from "@/models/Team"; // Import Team model
import { InvitedUsers } from "@/models/InvitedUsers"; // Import InvitedUsers model instead of Invitation
import saltAndHashPassword from "@/utils/password";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

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
      invitationCode = null,
      linkedin = null,
      resume = null,
      nda = null,
      team_id = null, // Add team_id field with null default
      termsAccepted = false
    } = await req.json();

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

    // Validate terms accepted
    if (!termsAccepted) {
      return NextResponse.json(
        {
          error: "Terms and Conditions not accepted",
          details: "You must accept the Terms and Conditions to register",
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

    // Role-specific validation
    if (role === 'data scientist' && (!phone || !location)) {
      return NextResponse.json(
        {
          error: "Missing required fields for Data Scientist",
          details: "Phone number and country are required for Data Scientist",
        },
        { status: 400 }
      );
    }

    if ((role === 'annotator' || role === 'agency owner') && 
        (domain.length === 0 || lang.length === 0 || !location)) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "Domain, language, and location are required for this role",
        },
        { status: 400 }
      );
    }

    // If team_id is provided, verify team exists
    if (team_id) {
      // Check if team_id is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(team_id)) {
        return NextResponse.json(
          {
            error: "Invalid team ID",
            message: "The provided team ID is not valid",
          },
          { status: 400 }
        );
      }

      const team = await Team.findById(team_id);
      if (!team) {
        return NextResponse.json(
          {
            error: "Team not found",
            message: "The selected team does not exist",
          },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = saltAndHashPassword(password);

    // Define user data with all fields including team_id
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      // For data scientists, initialize these as empty arrays even if not provided
      domain: role === 'data scientist' ? [] : (Array.isArray(domain) ? domain : []),
      lang: role === 'data scientist' ? [] : (Array.isArray(lang) ? lang : []),
      location,
      linkedin,
      resume,
      nda,
      team_id,
      permission: [],
      lastLogin: new Date(),
      invitation: invitationCode ? invitationCode : null, // Set to null if empty string or falsy
    };

    // Create new user using the model
    const newUser = new User(userData);
    await newUser.save();

    // If team_id is provided, add user to team members
    if (team_id) {
      await Team.findByIdAndUpdate(
        team_id,
        { $addToSet: { members: newUser._id } }
      );
    }

    // Check for pending invitations for this email and mark them as accepted
    // Only for annotators, not data scientists
    if (role === 'annotator') {
      const pendingInvitations = await InvitedUsers.find({
        email: email.toLowerCase(),
        status: 'pending'
      });

      if (pendingInvitations.length > 0) {
        // Update all pending invitations
        await InvitedUsers.updateMany(
          { _id: { $in: pendingInvitations.map(inv => inv._id) } },
          { 
            status: 'accepted',
            acceptedBy: newUser._id,
            updated_at: new Date()
          }
        );
      }
    }

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
          team_id: newUser.team_id, // Include team_id in response
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