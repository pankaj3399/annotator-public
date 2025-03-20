// app/api/storage/connect/s3/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StorageCredentials } from "@/models/StorageCredentials";
import { getServerSession } from "next-auth/next";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";


export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request JSON
    const data = await request.json();
    const { bucketName, region, folderPrefix, accessKeyId, secretAccessKey } = data;

    // Validate required fields
    if (!bucketName || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Test the S3 credentials
    try {
      const s3Client = new S3Client({
        region: region || "us-east-1",
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Verify the bucket exists and is accessible
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (s3Error: any) {
      console.error("S3 Error:", s3Error);
      return NextResponse.json(
        { 
          error: "Invalid S3 credentials or bucket access", 
          message: s3Error.message 
        },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Store AWS credentials directly without encryption
    const rawAccessKey = accessKeyId;
    const rawSecretKey = secretAccessKey;

    // Create a new storage connection
    const newConnection = new StorageCredentials({
      user_id: session.user.id,
      storageType: 's3',
      s3Config: {
        bucketName,
        region: region || "us-east-1",
        folderPrefix: folderPrefix || '',
      },
      credentials: {
        accessKeyId: rawAccessKey,
        secretAccessKey: rawSecretKey,
      },
      isActive: true,
      lastUsed: null,
    });

    // Save the new connection
    await newConnection.save();

    return NextResponse.json({ 
      message: "S3 connection added successfully",
      connection: {
        _id: newConnection._id,
        storageType: newConnection.storageType,
        isActive: newConnection.isActive,
        s3Config: {
          bucketName,
          region: region || "us-east-1",
          folderPrefix: folderPrefix || '',
        }
      }
    });
  } catch (error: any) {
    console.error("Error adding S3 connection:", error);
    return NextResponse.json(
      { error: "Failed to add S3 connection", message: error.message },
      { status: 500 }
    );
  }
}