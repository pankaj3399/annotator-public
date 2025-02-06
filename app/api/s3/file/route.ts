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
    const mongoId = new ObjectId().toString();
    const fileExtension = filename.split('.').pop();
    const s3Path = `benchmarks/${mongoId}.${fileExtension}`;

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
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}