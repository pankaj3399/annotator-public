// app/api/projects/[projectId]/guidelines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from 'mongodb';

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

    const project = await Project.findById(params.projectId)
      .select('description guidelineMessages guidelineFiles')
      .populate({
        path: 'guidelineMessages.sender',
        select: 'name email image'
      })
      .populate({
        path: 'guidelineFiles.uploadedBy',
        select: 'name email image'
      });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      description: project.description,
      messages: project.guidelineMessages,
      files: project.guidelineFiles
    });
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guidelines" },
      { status: 500 }
    );
  }
}

// Add a new message to guidelines
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

    const { content, attachments = [] } = await request.json();
    
    if (!content && attachments.length === 0) {
      return NextResponse.json(
        { success: false, error: "Message content or attachments required" },
        { status: 400 }
      );
    }

    const newMessage = {
      sender: session.user.id,
      content,
      timestamp: new Date(),
      attachments
    };

    const project = await Project.findByIdAndUpdate(
      params.projectId,
      { $push: { guidelineMessages: newMessage } },
      { new: true }
    ).populate({
      path: 'guidelineMessages.sender',
      select: 'name email image',
      match: { _id: session.user.id }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the newly added message (the last one in the array)
    const addedMessage = project.guidelineMessages[project.guidelineMessages.length - 1];

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

// Update project description
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
    
    const project = await Project.findByIdAndUpdate(
      params.projectId,
      { description },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      description: project.description
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

// Register a file after upload is complete
