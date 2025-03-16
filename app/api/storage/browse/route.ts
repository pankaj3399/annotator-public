// app/api/storage/browse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StorageCredentials } from "@/models/StorageCredentials";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";

// Initialize S3 client with credentials
function initializeS3Client(credentials: any, s3Config: any) {
    try {
      // First verify that we have credentials
      if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
        throw new Error("Missing required S3 credentials");
      }
  
      // Use credentials directly without decryption
      const accessKeyId = credentials.accessKeyId;
      const secretAccessKey = credentials.secretAccessKey;
  
      console.log("Initializing S3 client with config:", JSON.stringify({
        region: s3Config.region,
        hasCredentials: true
      }));
  
      return new S3Client({
        region: s3Config.region || "us-east-1",
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
    } catch (error) {
      console.error("S3 client initialization error:", error);
      throw new Error("Failed to initialize S3 client: " + (error instanceof Error ? error.message : "unknown error"));
    }
}

// Initialize Google Drive client with credentials
function initializeGoogleDriveClient(googleDriveConfig: any) {
  console.log("=== GOOGLE DRIVE CLIENT INITIALIZATION ===");
  console.log("Google Drive Config:", JSON.stringify({
    hasRefreshToken: !!googleDriveConfig.refreshToken,
    refreshTokenLength: googleDriveConfig.refreshToken ? googleDriveConfig.refreshToken.length : 0,
    hasAccessToken: !!googleDriveConfig.accessToken,
    accessTokenLength: googleDriveConfig.accessToken ? googleDriveConfig.accessToken.length : 0,
    hasTokenExpiry: !!googleDriveConfig.tokenExpiry,
    tokenExpiry: googleDriveConfig.tokenExpiry,
    email: googleDriveConfig.email,
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET
  }));

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google"
    );

    // Set credentials
    const credentials = {
      refresh_token: googleDriveConfig.refreshToken,
      access_token: googleDriveConfig.accessToken,
      expiry_date: googleDriveConfig.tokenExpiry ? new Date(googleDriveConfig.tokenExpiry).getTime() : undefined,
    };

    console.log("Setting OAuth2 credentials");
    oauth2Client.setCredentials(credentials);

    // Set up token refresh callback
    oauth2Client.on('tokens', (tokens) => {
      console.log('New tokens received:', JSON.stringify({
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      }));
    });

    console.log("Creating Google Drive client");
    return google.drive({ version: "v3", auth: oauth2Client });
  } catch (error) {
    console.error("Error initializing Google Drive client:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  console.log("\n\n=== API ROUTE: /api/storage/browse - START ===");
  
  try {
    // Check authentication
    console.log("Checking authentication");
    let session;
    try {
      session = await getServerSession(authOptions);
      if (!session) {
        console.log("Authentication failed - No session");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      console.log("Authentication successful:", session.user?.email);
    } catch (authError: any) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Authentication error", message: authError.message },
        { status: 500 }
      );
    }

    // Get query parameters
    console.log("Parsing query parameters");
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");
    const path = url.searchParams.get("path") || "/";
    console.log(`Query params: storageId=${storageId}, path=${path}`);

    if (!storageId) {
      console.log("Missing storageId parameter");
      return NextResponse.json(
        { error: "Storage ID is required" },
        { status: 400 }
      );
    }

    // Connect to the database
    console.log("Connecting to database");
    try {
      await connectToDatabase();
      console.log("Database connection successful");
    } catch (dbError: any) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Failed to connect to database", message: dbError.message },
        { status: 500 }
      );
    }

    // Get storage credentials
    console.log(`Fetching storage credentials for ID: ${storageId}`);
    let storageCredentials;
    try {
      storageCredentials = await StorageCredentials.findById(storageId);
      if (!storageCredentials) {
        console.log("Storage configuration not found");
        return NextResponse.json(
          { error: "Storage configuration not found" },
          { status: 404 }
        );
      }
      console.log(`Storage found: type=${storageCredentials.storageType}`);
    } catch (modelError: any) {
      console.error("Storage model error:", modelError);
      return NextResponse.json(
        { error: "Failed to retrieve storage credentials", message: modelError.message },
        { status: 500 }
      );
    }
    
    // You might want to verify ownership in a production environment
    // if (storageCredentials.user_id.toString() !== session.user.id) {
    //   console.log("Unauthorized access attempt - user ID mismatch");
    //   return NextResponse.json(
    //     { error: "Unauthorized access to storage" },
    //     { status: 403 }
    //   );
    // }

    let files = [];

    // Browse based on storage type
    if (storageCredentials.storageType === 's3') {
      console.log("=== PROCESSING S3 STORAGE REQUEST ===");
      try {
        // Debug storage credentials
        console.log("S3 Config:", JSON.stringify({
          bucketName: storageCredentials.s3Config?.bucketName,
          region: storageCredentials.s3Config?.region,
          hasCredentials: !!storageCredentials.credentials
        }));
        
        // Create S3 client
        const s3Client = initializeS3Client(storageCredentials.credentials, storageCredentials.s3Config);
        
        // Clean up the path for S3
        let prefix = path;
        if (prefix.startsWith("/")) {
          prefix = prefix.substring(1);
        }
        
        // Handle root directory
        if (prefix === "/") {
          prefix = "";
        }
        
        // For better folder navigation, ensure prefix ends with / if it's not empty
        if (prefix && !prefix.endsWith("/")) {
          prefix = `${prefix}/`;
        }
        
        console.log(`Listing S3 objects with prefix: "${prefix}"`);
        const command = new ListObjectsV2Command({
          Bucket: storageCredentials.s3Config.bucketName,
          Prefix: prefix,
          Delimiter: "/",
        });

        console.log("Sending S3 ListObjectsV2Command");
        const s3Response = await s3Client.send(command);
        console.log("S3 response received:", JSON.stringify({
          commonPrefixesCount: s3Response.CommonPrefixes?.length || 0,
          contentsCount: s3Response.Contents?.length || 0
        }));
        
        // Process folders (CommonPrefixes)
        if (s3Response.CommonPrefixes) {
          for (const commonPrefix of s3Response.CommonPrefixes) {
            if (commonPrefix.Prefix) {
              // Extract folder name from prefix
              const folderName = commonPrefix.Prefix.replace(prefix, "").replace("/", "");
              console.log(`Found folder: ${folderName}`);
              
              files.push({
                id: commonPrefix.Prefix,
                name: folderName,
                type: "folder",
                path: commonPrefix.Prefix,
              });
            }
          }
        }
        
        // Process files (Contents)
        if (s3Response.Contents) {
          for (const content of s3Response.Contents) {
            // Skip the prefix itself if it's included in contents
            if (content.Key === prefix) {
              console.log(`Skipping prefix itself: ${content.Key}`);
              continue;
            }
            
            // Extract file name from key
            const fileName = content.Key?.replace(prefix, "");
            
            // Skip files that are actually inside subfolders
            if (fileName && fileName.includes("/")) {
              console.log(`Skipping subfolder content: ${fileName}`);
              continue;
            }
            
            if (fileName && content.Key) {
              console.log(`Found file: ${fileName}`);
              files.push({
                id: content.Key,
                name: fileName,
                type: "file",
                mimeType: getMimeType(fileName),
                size: content.Size,
                lastModified: content.LastModified?.toISOString(),
                url: `https://${storageCredentials.s3Config.bucketName}.s3.${storageCredentials.s3Config.region}.amazonaws.com/${content.Key}`,
              });
            }
          }
        }
      } catch (s3Error: any) {
        console.error("S3 browsing error:", s3Error);
        console.error("S3 error stack:", s3Error.stack);
        return NextResponse.json(
          { error: "Failed to browse S3", message: s3Error.message },
          { status: 500 }
        );
      }
    } else if (storageCredentials.storageType === 'googleDrive') {
      console.log("=== PROCESSING GOOGLE DRIVE STORAGE REQUEST ===");
      try {
        // Debug Google Drive config
        console.log("Google Drive Config from DB:", JSON.stringify({
          email: storageCredentials.googleDriveConfig?.email,
          hasAccessToken: !!storageCredentials.googleDriveConfig?.accessToken,
          hasRefreshToken: !!storageCredentials.googleDriveConfig?.refreshToken,
          tokenExpiry: storageCredentials.googleDriveConfig?.tokenExpiry
        }));
        
        // Check environment variables
        console.log("Google API Environment Variables:", JSON.stringify({
          hasClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI
        }));
        
        // Create Google Drive client
        console.log("Creating Google Drive client");
        const drive = initializeGoogleDriveClient(storageCredentials.googleDriveConfig);
        
        // Determine the folder ID to list
        let folderId = 'root'; // Default to root folder
        
        if (path !== "/" && path !== "") {
          // This assumes the path is actually a Google Drive folder ID
          folderId = path;
          console.log(`Using provided path as folder ID: ${folderId}`);
        } else {
          console.log(`Using root folder as no specific path provided`);
        }
        
        console.log(`Listing Google Drive files in folder: ${folderId}`);
        
        // Build the query for Google Drive
        // For CSV files, we need to look for both Google Sheets and regular CSV files
        const query = `'${folderId}' in parents and trashed = false`;
        
        console.log(`Google Drive query: ${query}`);
        console.log("Sending Google Drive API request");
        
        // List files and folders in the specified directory
        try {
          // First, test the API connection with a simple call
          console.log("Testing Google Drive API connection");
          const aboutResponse = await drive.about.get({
            fields: 'user,storageQuota'
          });
          console.log("Google Drive API connection test successful:", JSON.stringify({
            user: aboutResponse.data.user,
            quotaUsed: aboutResponse.data.storageQuota?.usage,
            quotaTotal: aboutResponse.data.storageQuota?.limit
          }));
        } catch (aboutError) {
          console.error("Google Drive API connection test failed:", aboutError);
          console.error("This indicates a problem with authentication or API access");
        }
        
        // Now fetch files and folders
        console.log("Fetching files and folders from Google Drive");
        const response = await drive.files.list({
          q: query,
          fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink)',
          pageSize: 100,
          orderBy: 'folder,name',
        });
        
        console.log("Google Drive API response status:", response.status);
        console.log("Google Drive API response headers:", JSON.stringify(response.headers));
        
        const driveFiles = response.data.files || [];
        console.log(`Found ${driveFiles.length} files/folders in Google Drive`);
        console.log("First few files from response:", JSON.stringify(driveFiles.slice(0, 3)));
        
        // Debug fields in the response
        if (driveFiles.length > 0) {
          const sample = driveFiles[0];
          console.log("Sample file fields available:", Object.keys(sample));
        }
        
        // Filter to only show folders and CSV files on the client side
        const filteredDriveFiles = driveFiles.filter(file => {
          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
          const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
          const isCsvFile = file.name?.toLowerCase().endsWith('.csv');
          
          return isFolder || isGoogleSheet || isCsvFile;
        });
        
        console.log(`After filtering, ${filteredDriveFiles.length} items remain`);
        
        // Map Google Drive files to our format
        files = filteredDriveFiles.map(file => {
          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
          console.log(`Processing ${isFolder ? 'folder' : 'file'}: ${file.name} (${file.mimeType})`);
          
          // Determine the URL to use
          let fileUrl = file.webViewLink; // Default to webViewLink
          if (file.webContentLink) {
            // If webContentLink is available, use it for direct file access
            fileUrl = file.webContentLink;
            console.log(`Using webContentLink for ${file.name}`);
          } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
            // For Google Sheets, append export parameter to get CSV
            fileUrl = `${file.webViewLink}&export=csv`;
            console.log(`Adding export=csv for Google Sheet: ${file.name}`);
          }
          
          return {
            id: file.id || '',
            name: file.name || 'Unnamed',
            type: isFolder ? 'folder' : 'file',
            mimeType: file.mimeType || '',
            size: isFolder ? undefined : parseInt(file.size || '0'),
            lastModified: file.modifiedTime,
            path: isFolder ? file.id : undefined, // For folders, use ID as the path
            url: fileUrl,
          };
        });
        
        console.log(`Processed ${files.length} items for response`);
        
      } catch (driveError: any) {
        console.error("Google Drive browsing error:", driveError);
        
        // More detailed error reporting
        if (driveError.response) {
          console.error("Google Drive API error response:", JSON.stringify({
            status: driveError.response.status,
            statusText: driveError.response.statusText,
            data: driveError.response.data
          }));
        }
        
        console.error("Google Drive error stack:", driveError.stack);
        
        return NextResponse.json(
          { error: "Failed to browse Google Drive", message: driveError.message },
          { status: 500 }
        );
      }
    } else {
      console.log(`Invalid storage type: ${storageCredentials.storageType}`);
      return NextResponse.json(
        { error: "Invalid storage type" },
        { status: 400 }
      );
    }

    // Update the last used timestamp
    console.log("Updating last used timestamp");
    try {
      await StorageCredentials.findByIdAndUpdate(storageId, {
        lastUsed: new Date()
      });
      console.log("Last used timestamp updated successfully");
    } catch (updateError: any) {
      // Just log the error but don't fail the request
      console.error("Failed to update last used timestamp:", updateError);
    }

    console.log(`Returning ${files.length} files/folders`);
    console.log("=== API ROUTE: /api/storage/browse - END ===\n\n");
    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("Unexpected browse error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to browse files", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to determine MIME type based on file extension
function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'csv': 'text/csv',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}