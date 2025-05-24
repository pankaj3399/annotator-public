import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectToDatabase } from "@/lib/db";
import NotificationTemplate from "@/models/NotificationTemplate";
import { authOptions } from '@/auth';

export async function PUT(
  req: Request,
  { params }: { params: { projectId: string; templateId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const { templateId } = params; // Get templateId from URL params
    const updates = await req.json(); // Get update data from body

    // Ensure template ID is provided
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find and update the template
    const updatedTemplate = await NotificationTemplate.findByIdAndUpdate(
      templateId, // Use templateId from URL params
      updates,    // Use update data from request body
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

export async function DELETE(
  req: Request,
  { params }: { params: { projectId: string; templateId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const { templateId } = params; // Get templateId from URL params

    // Ensure template ID is provided
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find and delete the template
    const deletedTemplate = await NotificationTemplate.findByIdAndDelete(templateId);

    // Check if the template exists
    if (!deletedTemplate) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete template" },
      { status: 500 }
    );
  }
}