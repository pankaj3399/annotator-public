// app/api/storage/connect/google-drive/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StorageCredentials } from "@/models/StorageCredentials";
import { google } from "googleapis";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const redirectUri = `${nextAuthUrl}api/auth/callback/google`;
// Your Google OAuth credentials from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =redirectUri
// Modify these lines
const FRONTEND_REDIRECT_SUCCESS = `${nextAuthUrl}/data?status=success`;
const FRONTEND_REDIRECT_ERROR =  `${nextAuthUrl}/data?status=error`;
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
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle error from OAuth provider
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(`${FRONTEND_REDIRECT_ERROR}&message=${encodeURIComponent(error)}`);
    }

    // Ensure code is present
    if (!code || !state) {
      console.error("Missing code or state parameter");
      return NextResponse.redirect(`${FRONTEND_REDIRECT_ERROR}&message=${encodeURIComponent("Missing authorization code")}`);
    }

    // Get tokens
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info to store with credentials
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    
    const userInfo = await oauth2.userinfo.get();
    
    // Connect to database
    await connectToDatabase();

    // Store the tokens in the database
    const userId = state; // The state parameter contains the user ID
    
    // Check if credentials already exist
    let storageCredentials = await StorageCredentials.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      storageType: 'googleDrive',
      isActive: true
    });

    if (storageCredentials) {
      // Update existing credentials
      storageCredentials.googleDriveConfig = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || storageCredentials.googleDriveConfig.refreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        displayName: userInfo.data.name,
        email: userInfo.data.email
      };
    } else {
      // Create new credentials
      storageCredentials = new StorageCredentials({
        user_id: userId,
        storageType: 'googleDrive',
        googleDriveConfig: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          displayName: userInfo.data.name,
          email: userInfo.data.email
        },
        isActive: true
      });
    }

    await storageCredentials.save();

    // Redirect to frontend with success
    return NextResponse.redirect(`${FRONTEND_REDIRECT_SUCCESS}&provider=google-drive`);
  } catch (error: any) {
    console.error("Error in Google Drive OAuth callback:", error);
    return NextResponse.redirect(`${FRONTEND_REDIRECT_ERROR}&message=${encodeURIComponent(error.message)}`);
  }
}