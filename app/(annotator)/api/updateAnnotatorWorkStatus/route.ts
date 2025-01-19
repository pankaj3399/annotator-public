import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { authOptions } from "@/auth";
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).select("isReadyToWork");
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ isReadyToWork: user.isReadyToWork || false });
  } catch (error) {
    console.error("Error in GET isReadyToWork:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { isReadyToWork } = await req.json();

    if (typeof isReadyToWork !== "boolean") {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const result = await User.findByIdAndUpdate(
      session.user.id,
      { isReadyToWork },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isReadyToWork: result.isReadyToWork });
  } catch (error) {
    console.error("Error in POST isReadyToWork:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
