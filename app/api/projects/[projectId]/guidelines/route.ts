import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { Guideline } from '@/models/Guideline';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from 'mongodb';
interface Attachment {
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileUrl: string;
  s3Path: string;
}

interface GuidelineFile extends Attachment {
  uploadedBy: string;
}
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Get all guidelines for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find guidelines for the project
    const guidelines = await Guideline.findOne({ project: params.projectId })
      .populate({
        path: 'messages.sender',
        select: 'name email image'
      })
      .populate({
        path: 'files.uploadedBy',
        select: 'name email image'
      });

    if (!guidelines) {
      return NextResponse.json({ 
        success: true, 
        description: '',
        messages: [],
        files: []
      });
    }

    return NextResponse.json({ 
      success: true, 
      description: guidelines.description,
      messages: guidelines.messages,
      files: guidelines.files
    });
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guidelines" },
      { status: 500 }
    );
  }
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

    const { content = '', attachments = [], isAiMessage, aiProvider, aiModel } = await request.json();
    
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Message content or attachments required" },
        { status: 400 }
      );
    }

    // Find or create guidelines for the project
    let guidelines = await Guideline.findOne({ project: params.projectId });
    
    if (!guidelines) {
      guidelines = new Guideline({ 
        project: params.projectId,
        description: '',
        messages: [],
        files: []
      });
    }

    // Create new message
    const newMessage = {
      sender: session.user.id,
      content: content.trim() || 'Attachment shared', // Ensure non-empty content
      timestamp: new Date(),
      attachments,
      isAiMessage: isAiMessage || false,
      aiProvider: isAiMessage ? aiProvider : undefined,
      aiModel: isAiMessage ? aiModel : undefined
    };

    // Add message to guidelines
    guidelines.messages.push(newMessage);

    // Add new files to guidelines if they don't already exist
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment: Attachment) => {
        const existingFileIndex = guidelines.files.findIndex(
          (file: GuidelineFile) => file.s3Path === attachment.s3Path
        );

        if (existingFileIndex === -1) {
          const newFile: GuidelineFile = {
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            fileUrl: attachment.fileUrl,
            s3Path: attachment.s3Path,
            uploadedBy: session.user.id
          };
          guidelines.files.push(newFile);
        }
      });
    }

    // Save guidelines
    await guidelines.save();

    // Populate sender details
    await guidelines.populate({
      path: 'messages.sender',
      select: 'name email image'
    });

    // Get the newly added message
    const addedMessage = guidelines.messages[guidelines.messages.length - 1];

    return NextResponse.json({ 
      success: true, 
      message: addedMessage
    });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { success: false, error: "Failed to add message" },
      { status: 500 }
    );
  }
}

// Update guidelines description
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description } = await request.json();
    
    // Find or create guidelines for the project
    let guidelines = await Guideline.findOne({ project: params.projectId });
    
    if (!guidelines) {
      guidelines = new Guideline({ 
        project: params.projectId,
        description: description || '',
        messages: [],
        files: []
      });
    } else {
      guidelines.description = description || '';
    }

    await guidelines.save();

    return NextResponse.json({ 
      success: true, 
      description: guidelines.description
    });
  } catch (error) {
    console.error('Error updating description:', error);
    return NextResponse.json(
      { success: false, error: "Failed to update description" },
      { status: 500 }
    );
  }
}

// File upload presigned URL
export async function OPTIONS(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { filename, contentType } = await request.json();
    const mongoId = new ObjectId().toString();
    const extension = filename.split('.').pop();
    const s3Path = `guidelines/${mongoId}.${extension}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: s3Path,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({ 
      success: true, 
      url: signedUrl,
      s3Path: s3Path,
      mongoId: mongoId
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}