// app/api/s3/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();
    const mongoId= new ObjectId().toString()
    const s3Path = `uploads/${mongoId}.mp4`;
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
      mongoId:mongoId
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}


export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const s3Path = url.searchParams.get('s3Path');
    
    if (!s3Path) {
      return NextResponse.json(
        { success: false, error: "S3 path is required" },
        { status: 400 }
      );
    }
    
    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'ap-south-1';
    
    if (!bucketName) {
      return NextResponse.json(
        { success: false, error: "AWS bucket configuration is missing" },
        { status: 500 }
      );
    }
    
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Path}`;
    
    return NextResponse.json({ success: true, fileUrl });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to generate S3 URL" },
      { status: 500 }
    );
  }
}