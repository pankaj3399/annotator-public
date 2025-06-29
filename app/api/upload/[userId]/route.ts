// app/api/upload/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { UTApi } from "uploadthing/server";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { UploadThingError } from "uploadthing/server";
import { isAdmin } from "@/lib/userRoles";

const utapi = new UTApi();

type AllowedFileType = 'pdf' | 'document' | 'image' | 'resume' | 'nda' | 'profilePicture';

type FieldMapping = {
  [K in AllowedFileType]?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log("1. Route hit, checking session...");

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = params?.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Move auth check after db connection
    if (session.user.id !== userId && !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
    console.log("2. Getting form data...");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as AllowedFileType;
    console.log("3. Received file:", {
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size,
        uploadType: type
      });
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes: Record<string, string[]> = {
      pdf: ["application/pdf"],
      document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      image: ["image/jpeg", "image/png", "image/gif"],
      resume: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      nda: ["application/pdf"],
      profilePicture: ["image/jpeg", "image/png", "image/gif"]
    };

    if (!allowedTypes[type]?.includes(file.type)) {
        return NextResponse.json(
          { 
            error: `Invalid file type. Allowed types for ${type}: ${allowedTypes[type].join(", ")}`,
            message: `Invalid file type. Allowed types for ${type}: ${allowedTypes[type].join(", ")}`
          },
          { status: 400 }
        );
      }
      

    // Get user before upload to check existing files
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    console.log("4. Creating file buffer...");

    // Create a new File instance from the uploaded file
    const fileBuffer = await file.arrayBuffer();
    const uploadFile = new File([fileBuffer], file.name, { 
      type: file.type,
      lastModified: Date.now()
    });
    console.log("5. Uploading to UploadThing...");

    // Upload to UploadThing
    const uploadResponse = await utapi.uploadFiles([uploadFile]);

    if (!Array.isArray(uploadResponse) || !uploadResponse[0]?.data?.url) {
      throw new Error("Upload failed");
    }

    // Map file types to user fields
    const fieldMapping: FieldMapping = {
      resume: "resume",
      nda: "nda",
      profilePicture: "profilePicture",
      pdf: "resume",
      document: "resume",
      image: "profilePicture"
    };

    const fieldToUpdate = fieldMapping[type];
    if (!fieldToUpdate) {
      return NextResponse.json(
        { error: "Invalid file type specified" },
        { status: 400 }
      );
    }

    // Delete old file if it exists
    const existingFileUrl = user[fieldToUpdate as keyof typeof user] as string;
    if (existingFileUrl) {
      try {
        const fileKey = existingFileUrl.split('/').pop();
        if (fileKey) {
          await utapi.deleteFiles([fileKey]);
        }
      } catch (error) {
        console.error("Error deleting old file:", error);
      }
    }

    // Update user with new file URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        [fieldToUpdate]: uploadResponse[0].data.url,
        updated_at: new Date()
      },
      { 
        new: true, 
        select: "-password",
        runValidators: true 
      }
    ).lean();

    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    return NextResponse.json({
      message: "File uploaded successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error handling file upload:", error);

    if (error instanceof UploadThingError) {
      if (error.message?.includes("file size")) {
        return NextResponse.json(
          { error: "File size exceeds limit" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Upload failed", 
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}