// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { ResetToken } from "@/models/ResetToken";
import crypto from "crypto";
import { sendEmail, getPasswordResetEmailTemplate } from "@/lib/email";
import { connectToDatabase } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Use the connection utility instead of manual connection
    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ message: "If your email exists, you'll receive a reset link" });
    }

    // Generate token and expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Save token in database
    await ResetToken.create({ email, token, expires });

    // Create reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send email using our utility
    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: getPasswordResetEmailTemplate(resetLink)
    });

    return NextResponse.json({ message: "If your email exists, you'll receive a reset link" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}