// app/api/storage/connect/google-drive/file/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { google } from "googleapis";
import { authOptions } from "@/auth";
import { StorageCredentials } from "@/models/StorageCredentials";
import { connectToDatabase } from "@/lib/db";

// Create OAuth client
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google"
  );
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    const connectionId = url.searchParams.get("connectionId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Retrieve storage credentials
    const storageCredentials = await StorageCredentials.findById(connectionId);
    
    if (!storageCredentials || storageCredentials.storageType !== 'googleDrive') {
      return NextResponse.json(
        { error: "Google Drive connection not found" },
        { status: 404 }
      );
    }

    // Set up OAuth client with stored credentials
    const oauth2Client = getOAuthClient();
    
    oauth2Client.setCredentials({
      refresh_token: storageCredentials.googleDriveConfig.refreshToken,
      access_token: storageCredentials.googleDriveConfig.accessToken,
      expiry_date: storageCredentials.googleDriveConfig.tokenExpiry ? 
        new Date(storageCredentials.googleDriveConfig.tokenExpiry).getTime() : undefined
    });

    // Create Drive client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // First, get the file metadata to check if it's a Google Sheet
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'mimeType,name,size'
    });

    console.log("File metadata:", fileMetadata.data);

    // Handle Google Sheet
    if (fileMetadata.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
      console.log("Requesting Google Sheet as CSV");
      
      // For Google Sheets, we need to use the export feature
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/csv'
      }, {
        responseType: 'arraybuffer'
      });

      if (!response.data) {
        throw new Error("Empty response from Google Drive API");
      }

      const csvContent = Buffer.from(response.data as ArrayBuffer).toString('utf-8');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileMetadata.data.name || 'download'}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } 
    // Handle CSV file
    else if (fileMetadata.data.mimeType === 'text/csv' || 
             fileMetadata.data.name?.toLowerCase().endsWith('.csv')) {
      console.log("Downloading CSV file");
      
      // For regular files, we can download directly
      const response = await drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      if (!response.data) {
        throw new Error("Empty response from Google Drive API");
      }

      const csvContent = Buffer.from(response.data as ArrayBuffer).toString('utf-8');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileMetadata.data.name || 'download'}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      return NextResponse.json(
        { error: "File is not a CSV or Google Sheet" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Google Drive file access error:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to access Google Drive file";
    let errorDetails = error.message;
    
    // Handle token expiration explicitly
    if (error.code === 401 || 
        (error.response && error.response.status === 401) || 
        error.message.includes('token')) {
      errorMessage = "Google Drive authorization expired";
      errorDetails = "Please reconnect your Google Drive account";
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: error.code || 500 }
    );
  }
}