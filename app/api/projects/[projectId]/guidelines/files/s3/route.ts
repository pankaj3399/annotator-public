// File: app/api/projects/[projectId]/guidelines/files/s3/route.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// POST route for guideline file upload URLs
export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType } = await req.json();
    const projectId = params.projectId;
    
    if (!filename || !contentType) {
      return NextResponse.json(
        { success: false, error: "Filename and content type are required" },
        { status: 400 }
      );
    }

    // Generate unique ID
    const fileId = new ObjectId().toString();
    
    // Get file extension
    const fileExt = filename.includes('.') ? filename.split('.').pop() || '' : '';
    
    // Create a path specific to this project's guidelines
    const s3Path = `projects/${projectId}/guidelines/${fileId}${fileExt ? '.' + fileExt : ''}`;
    
    // Create the upload command
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: s3Path,
      ContentType: contentType,
    });

    // Generate presigned URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({ 
      success: true, 
      url: signedUrl,
      s3Path: s3Path,
      fileId: fileId
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

// GET route for guideline file access
export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const s3Path = url.searchParams.get('s3Path');
    const operation = url.searchParams.get('operation') || 'url'; // Default to URL
    
    if (!s3Path) {
      return NextResponse.json(
        { success: false, error: "S3 path is required" },
        { status: 400 }
      );
    }
    
    const bucketName = process.env.AWS_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { success: false, error: "AWS bucket configuration is missing" },
        { status: 500 }
      );
    }

    // Handle different operations
    if (operation === 'url') {
      // Generate a presigned URL for downloading
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Path,
      });
      
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      return NextResponse.json({ 
        success: true, 
        fileUrl: signedUrl 
      });
    } 
    else if (operation === 'content') {
      // Retrieve the actual file content for AI processing
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Path,
        });
        
        const response = await s3Client.send(command);
        
        // Get content type
        const contentType = response.ContentType || 'application/octet-stream';
        
        // Determine if this is a text file
        const isTextContent = contentType.includes('text') || 
                             contentType.includes('json') || 
                             contentType.includes('xml') ||
                             contentType.includes('javascript') ||
                             contentType.includes('csv');
                             
        // For text files, return the content
        if (isTextContent && response.Body) {
          // Convert stream to string
          const streamToString = async (stream: any) => {
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
              chunks.push(Buffer.from(chunk));
            }
            return Buffer.concat(chunks).toString('utf-8');
          };
          
          const content = await streamToString(response.Body);
          
          return NextResponse.json({ 
            success: true, 
            contentType,
            content,
            isTextContent: true
          });
        } else {
          // For binary files, return a reference
          return NextResponse.json({ 
            success: true, 
            contentType,
            content: `[Binary file: ${s3Path}]`,
            isTextContent: false
          });
        }
      } catch (error) {
        console.error("Error fetching file content:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch file content" },
          { status: 500 }
        );
      }
    }
    else {
      return NextResponse.json(
        { success: false, error: "Invalid operation" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error handling file request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process file request" },
      { status: 500 }
    );
  }
}