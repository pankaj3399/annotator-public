import { NextResponse } from "next/server";
import { CustomField } from "@/models/CustomField";
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from '@/auth';

export async function GET() {
  try {
    await connectToDatabase();
    const customFields = await CustomField.find({ isActive: true }).sort("created_at");
    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { message: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "system admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { fields } = await req.json();
    await connectToDatabase();

    // Delete existing fields and create new ones
    await CustomField.deleteMany({});
    const savedFields = await CustomField.create(fields);

    return NextResponse.json(savedFields);
  } catch (error) {
    console.error("Error saving custom fields:", error);
    return NextResponse.json(
      { message: "Failed to save custom fields" },
      { status: 500 }
    );
  }
}