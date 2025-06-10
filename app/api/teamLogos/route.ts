// app/api/teamLogos/route.ts
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

export async function POST(req: Request) {
  try {
    const { filename, contentType, teamId } = await req.json();
    console.log('Team logo upload request:', { filename, contentType, teamId });
    
    // Create a unique filename with teamId prefix
    const uniqueFilename = `team-${teamId}-${Date.now()}-${filename}`;
    console.log('Generated unique filename:', uniqueFilename);
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `teamLogos/${uniqueFilename}`,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('Generated signed URL');
    
    // Return both the signed URL for upload and the final public URL
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/teamLogos/${uniqueFilename}`;
    console.log('Public URL:', publicUrl);
    
    return NextResponse.json({ 
      success: true, 
      uploadUrl: signedUrl,
      publicUrl: publicUrl
    });
  } catch (error) {
    console.error('Error generating team logo upload URL:', error);
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}