// app/api/s3/video/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Supported video formats for annotation
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'video/quicktime'
];

// Max file size (500MB for videos)
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: Request) {
  try {
    const { filename, contentType, fileSize } = await req.json();
    
    // Validate video content type
    if (!SUPPORTED_VIDEO_TYPES.includes(contentType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported video format. Supported formats: ${SUPPORTED_VIDEO_TYPES.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        },
        { status: 400 }
      );
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}_${cleanFilename}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `videos/${uniqueFilename}`, // Store in videos/ folder
      ContentType: contentType,
      Metadata: {
        'original-filename': filename,
        'upload-timestamp': timestamp.toString(),
        'file-type': 'annotation-video'
      }
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Return both upload URL and final file URL
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/videos/${uniqueFilename}`;
    
    return NextResponse.json({ 
      success: true, 
      uploadUrl: signedUrl,
      fileUrl: fileUrl,
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('S3 video upload error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to generate video upload URL" },
      { status: 500 }
    );
  }
}