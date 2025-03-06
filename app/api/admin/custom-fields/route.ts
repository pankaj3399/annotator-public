// app/api/admin/custom-fields/route.ts

import { NextResponse } from "next/server";
import { CustomField } from "@/models/CustomField";
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from '@/auth';
import mongoose from "mongoose";

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
  teams: string[];
  updated_at?: Date;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Extract team filter from URL if present
    const url = new URL(req.url);
    const teamId = url.searchParams.get('teamId');
    
    let query = {};
    if (teamId) {
      // If teamId is provided, show fields where:
      // - forAllTeams is true, OR
      // - the specific team is included in teams array
      query = { 
        $or: [
          { forAllTeams: true },
          { teams: teamId }
        ],
        isActive: true 
      };
    } else {
      query = { isActive: true };
    }
    
    const customFields = await CustomField.find(query).sort("created_at");
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

    const { field } = await req.json() as { field: CustomFieldType };
    await connectToDatabase();

    // Create new field
    const savedField = await CustomField.create(field);
    return NextResponse.json(savedField);
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json(
      { message: "Failed to create custom field" },
      { status: 500 }
    );
  }
}