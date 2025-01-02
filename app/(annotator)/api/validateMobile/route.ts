import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/app/actions/task";
import { getAnnotatorByTaskId } from "@/app/actions/annotatorTask";
import { encode } from "next-auth/jwt";
export const dynamic = "force-dynamic";  // Force dynamic behavior for this route

export async function GET(req: NextRequest) {
  try {
    // Extract taskId and secretKey from the URL query parameters
    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");
    const secretKey = url.searchParams.get("secret-key");

    if (!taskId || !secretKey) {
      return NextResponse.json(
        { msg: "taskId or secretKey is missing" },
        { status: 400 }
      );
    }

    // Validate the secret key
    const envSecretKey = process.env.MOBILE_SECRET_KEY;
    if (secretKey !== envSecretKey) {
      return NextResponse.json(
        { msg: "Invalid secret key" },
        { status: 401 }
      );
    }

    // Fetch task using taskId
    const task = await getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { msg: "No task found for the provided taskId" },
        { status: 404 }
      );
    }

    // Fetch annotator based on task's annotator field
    const annotatorResponse = await getAnnotatorByTaskId(taskId);
    if (!annotatorResponse.data) {
      return NextResponse.json(
        { msg: "Bad request" },
        { status: 400 }
      );
    }

    const annotator = JSON.parse(annotatorResponse.data);
    if (!annotator) {
      return NextResponse.json(
        { msg: "No annotator found for this task" },
        { status: 404 }
      );
    }

    // Create session token in NextAuth format with required user information
    const token = await encode({
      token: {
        name: annotator.name,
        email: annotator.email,
        sub: annotator.id,
        id: annotator.id,  // Added to match the session.user.id check
        role: annotator.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Set secure cookie options
    const cookieOptions = [
      `next-auth.session-token=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${24 * 60 * 60}`,
    ];

    // Add Secure flag in production
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }

    // Add user session cookie for client-side access
    const userSession = {
      user: {
        id: annotator.id,
        name: annotator.name,
        email: annotator.email,
        role: annotator.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const sessionCookieOptions = [
      `next-auth.session=${encodeURIComponent(JSON.stringify(userSession))}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${24 * 60 * 60}`,
    ];

    if (process.env.NODE_ENV === 'production') {
      sessionCookieOptions.push('Secure');
    }

    // Construct redirect URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUrl = new URL(`/task/${taskId}`, baseUrl).toString();

    // Create response with redirect and cookies
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.append('Set-Cookie', cookieOptions.join('; '));
    redirectResponse.headers.append('Set-Cookie', sessionCookieOptions.join('; '));

    return redirectResponse;

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        msg: "Error while processing the request",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}