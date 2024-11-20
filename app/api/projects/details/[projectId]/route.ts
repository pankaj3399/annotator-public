// app/api/projects/details/[projectId]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {Project} from "@/models/Project";
import { getServerSession } from "next-auth";
import { authOptions } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const project = await Project.findById(params.projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
        created_at: project.created_at,
      },
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}