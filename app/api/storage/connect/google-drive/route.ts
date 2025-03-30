// app/api/storage/connect/google-drive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { google } from "googleapis";
import { authOptions } from "@/auth";
const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000/';
// Your Google OAuth credentials from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${nextAuthUrl}api/auth/callback/google`

// Create OAuth client
function getOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
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

    // Get state from query (optional)
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || session.user.id;

    const oauth2Client = getOAuthClient();
    
    // Generate authentication URL with enhanced scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // This will return a refresh token
      scope: [
        'https://www.googleapis.com/auth/drive.file', // Access to files created/opened by the app
        'https://www.googleapis.com/auth/drive.readonly', // Basic readonly access
        'https://www.googleapis.com/auth/spreadsheets.readonly', // Specific access for Google Sheets
        'https://www.googleapis.com/auth/userinfo.email', // To get user email
        'https://www.googleapis.com/auth/userinfo.profile', // To get user name
      ],
      prompt: 'consent', // Force the consent screen to ensure we get a refresh token
      state: state, // Pass state to callback (usually contains user ID)
      include_granted_scopes: true, // Include previously granted scopes
    });

    // Redirect user to Google's authorization page
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google Drive OAuth error:", error);
    return NextResponse.json(
      { error: "Failed to initialize Google Drive connection", message: error.message },
      { status: 500 }
    );
  }
}