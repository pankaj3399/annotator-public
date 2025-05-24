// app/api/storage/connect/google-drive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { google } from "googleapis";
import { authOptions } from "@/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000/';
// Your Google OAuth credentials from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${nextAuthUrl}api/storage/connect/google-drive/callback`

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
      access_type: 'offline', 
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent',
      state: state,
      include_granted_scopes: true,
    });

    // Create a response with a session preservation cookie
    const response = NextResponse.redirect(authUrl);
    
    // Set a cookie to preserve the auth state
    response.cookies.set('google_drive_auth_state', state, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
    });
    
    return response;
  } catch (error: any) {
    console.error("Google Drive OAuth error:", error);
    return NextResponse.json(
      { error: "Failed to initialize Google Drive connection", message: error.message },
      { status: 500 }
    );
  }
}