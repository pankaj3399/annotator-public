import { NextResponse } from "next/server";
import { CustomField } from "@/models/CustomField";
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from '@/auth';

// Define the CustomField type
interface CustomFieldType {
  _id?: string;
  name: string;
  label: string;
  type: 'text' | 'link' | 'file' | 'array';
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
  teams: string[];
  updated_at?: Date;
}

// Update a specific custom field
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "system admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { field } = await req.json() as { field: CustomFieldType };
    await connectToDatabase();
    
    const updatedField = await CustomField.findByIdAndUpdate(
      params.id,
      { ...field, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedField) {
      return NextResponse.json(
        { message: "Custom field not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedField);
  } catch (error) {
    console.error("Error updating custom field:", error);
    return NextResponse.json(
      { message: "Failed to update custom field" },
      { status: 500 }
    );
  }
}

// Delete a specific custom field
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "system admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    
    const deletedField = await CustomField.findByIdAndDelete(params.id);
    
    if (!deletedField) {
      return NextResponse.json(
        { message: "Custom field not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: "Custom field deleted successfully" });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json(
      { message: "Failed to delete custom field" },
      { status: 500 }
    );
  }
}