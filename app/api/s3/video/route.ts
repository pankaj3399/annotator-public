import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

// Initialize the S3 client with credentials from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Define the POST handler for generating presigned URLs
export async function POST(req: Request) {
  try {
    // Parse the incoming JSON request body
    const { files, mongoId } = await req.json(); // Changed from folderId to mongoId

    if (!mongoId) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Missing mongoId." },
        { status: 400 }
      );
    }

    // Check if files array is provided
    if (!Array.isArray(files)) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Missing files." },
        { status: 400 }
      );
    }

    // Create the folder path using mongoId
    const folder = `hls/${mongoId}`;


    // Initialize an object to store the presigned URLs
    const presignedUrls: { [key: string]: string } = {};

    // Loop through each file to generate a presigned URL
    for (const file of files) {
      const { name } = file;

      // Validate file data
      if (!name) {
        console.error(`Missing name for file: ${JSON.stringify(file)}`);
        continue; // Skip this file if validation fails
      }

      const s3Key = `${folder}/${name}`;
   
      // Set content type based on the file extension
      const contentType =
        name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";

      // Create the PutObjectCommand for presigned URL generation
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: s3Key,
        ContentType: contentType,
      });

      // Generate the presigned URL
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      presignedUrls[name] = presignedUrl; // Store the URL in the object
    }

    // Return the presigned URLs in the response
    return NextResponse.json({ 
      success: true, 
      presignedUrls,
      folder // Include the folder path in the response for reference
    });
  } catch (error) {
    console.error("Error generating presigned URLs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate presigned URLs" },
      { status: 500 }
    );
  }
}