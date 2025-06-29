// app/api/admin/custom-fields/[id]/route.ts
import { NextResponse } from "next/server";
import { CustomField } from "@/models/CustomField";
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from '@/auth';
import { isAdmin } from "@/lib/userRoles";

// Define the CustomField type
interface CustomFieldType {
  _id?: string;
  name: string;
  label: string;
  type: 'text' | 'link' | 'file' | 'array';
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
  forAllTeams: boolean;
  teams?: string[];
  updated_at?: Date;
}

// Get a specific custom field
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const customField = await CustomField.findById(params.id);
    
    if (!customField) {
      return NextResponse.json(
        { message: "Custom field not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(customField);
  } catch (error) {
    console.error("Error fetching custom field:", error);
    return NextResponse.json(
      { message: "Failed to fetch custom field" },
      { status: 500 }
    );
  }
}

// Update a specific custom field
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { field } = await req.json() as { field: CustomFieldType };
    await connectToDatabase();
    
    let updateData = { ...field, updated_at: new Date() };
    
    // If forAllTeams is true, remove the teams field from the database
    if (field.forAllTeams) {
      // Two operations needed:
      // 1. Delete the teams field from our update data
      delete updateData.teams;
      
      // 2. Use $unset to remove the teams field from the document in MongoDB
      const updatedField = await CustomField.findByIdAndUpdate(
        params.id,
        { 
          $set: updateData,
          $unset: { teams: "" } 
        },
        { new: true, runValidators: true }
      );
      
      if (!updatedField) {
        return NextResponse.json(
          { message: "Custom field not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(updatedField);
    } else {
      // Normal update if forAllTeams is false
      const updatedField = await CustomField.findByIdAndUpdate(
        params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (!updatedField) {
        return NextResponse.json(
          { message: "Custom field not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(updatedField);
    }
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
    if (!session || !isAdmin(session.user.role)) {
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