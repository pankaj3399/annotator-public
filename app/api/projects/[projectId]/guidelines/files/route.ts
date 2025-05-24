//app/api/projects/[projectId]/guidelines/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Guideline } from '@/models/Guideline';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { Document } from 'mongoose';

// Define an interface for the file type to match the Guideline model
interface GuidelineFile {
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileUrl: string;
  s3Path: string;
  uploadedBy: string;
}

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
    
    const newFile: GuidelineFile = {
      fileName,
      fileType,
      fileSize,
      fileUrl,
      s3Path,
      uploadedBy: session.user.id
    };

    // Find or create guidelines for the project
    let guidelines = await Guideline.findOne({ project: params.projectId });
    
    if (!guidelines) {
      guidelines = new Guideline({ 
        project: params.projectId,
        description: '',
        messages: [],
        files: [newFile]
      });
    } else {
      // Check if file already exists
      const existingFileIndex = guidelines.files.findIndex(
        (file: GuidelineFile) => file.s3Path === s3Path
      );

      if (existingFileIndex === -1) {
        guidelines.files.push(newFile);
      }
    }

    await guidelines.save();

    // Populate the uploaded by details
    await guidelines.populate({
      path: 'files.uploadedBy',
      select: 'name email image'
    });

    // Get the newly added file
    const addedFile = guidelines.files.find(
      (file: GuidelineFile) => file.s3Path === s3Path
    );

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