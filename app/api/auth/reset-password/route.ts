import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { ResetToken } from "@/models/ResetToken";
// Import the same password hashing function used in login
import saltAndHashPassword from "@/utils/password";
import { connectToDatabase } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { token, email, password } = await request.json();

    // Use the connection utility instead of manual connection
    await connectToDatabase();

    // Verify token
    const resetToken = await ResetToken.findOne({
      email,
      token,
      used: false,
      expires: { $gt: new Date() },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash password - using the SAME hashing method as in auth.ts
    const hashedPassword = saltAndHashPassword(password);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Mark token as used
    resetToken.used = true;
    await resetToken.save();

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}