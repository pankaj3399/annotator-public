import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectToDatabase } from "@/lib/db";
import NotificationTemplate from "@/models/NotificationTemplate";
import { authOptions } from '@/auth';

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const { _id, ...updates } = await req.json(); // Destructure _id and rest of the fields

    // Ensure template ID is provided
    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find and update the template
    const updatedTemplate = await NotificationTemplate.findByIdAndUpdate(
      _id,
      updates, // Use remaining fields for update
      { new: true }
    );

    // Check if the template exists
    if (!updatedTemplate) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update template" },
      { status: 500 }
    );
  }
}
