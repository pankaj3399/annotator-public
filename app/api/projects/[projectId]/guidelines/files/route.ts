import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: { projectId: string } }
  ) {
    try {
      await connectToDatabase();
      const session = await getServerSession(authOptions);
      
      if (!session || !session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const { fileName, fileType, fileSize, fileUrl, s3Path } = await request.json();
      
      const newFile = {
        fileName,
        fileType,
        fileSize,
        fileUrl,
        s3Path,
        uploadedAt: new Date(),
        uploadedBy: session.user.id
      };
  
      const project = await Project.findByIdAndUpdate(
        params.projectId,
        { $push: { guidelineFiles: newFile } },
        { new: true }
      ).populate({
        path: 'guidelineFiles.uploadedBy',
        select: 'name email image',
        match: { _id: session.user.id }
      });
  
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
  
      // Get the newly added file (the last one in the array)
      const addedFile = project.guidelineFiles[project.guidelineFiles.length - 1];
  
      return NextResponse.json({ 
        success: true, 
        file: addedFile
      });
    } catch (error) {
      console.error('Error registering file:', error);
      return NextResponse.json(
        { success: false, error: "Failed to register file" },
        { status: 500 }
      );
    }
  }