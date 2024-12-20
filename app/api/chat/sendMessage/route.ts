import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { sendMessage } from "@/app/actions/chat";
import { connectToDatabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  await connectToDatabase();
  
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groupId, message } = await req.json();

    if (!groupId || !message) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const result = await sendMessage(groupId, message);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: result.message }, { status: 200 });
  } catch (error) {
    console.error("Error in sendMessage API:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
