import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/app/actions/task";
import { getReviewerByTaskId } from "@/app/actions/task";
import { encode } from "next-auth/jwt";

export const dynamic = "force-dynamic"; // Force dynamic behavior for this route

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");
    const secretKey = url.searchParams.get("secret-key");

    if (!taskId || !secretKey) {
      return NextResponse.json(
        { msg: "taskId or secretKey is missing" },
        { status: 400 }
      );
    }

    const envSecretKey = process.env.MOBILE_SECRET_KEY;
    if (secretKey !== envSecretKey) {
      return NextResponse.json(
        { msg: "Invalid secret key" },
        { status: 401 }
      );
    }

    const task = await getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { msg: "No task found for the provided taskId" },
        { status: 404 }
      );
    }

    const reviewerResponse = await getReviewerByTaskId(taskId);
    if (!reviewerResponse.data) {
      return NextResponse.json(
        { msg: "Bad request" },
        { status: 400 }
      );
    }

    const reviewer = JSON.parse(reviewerResponse.data);
    if (!reviewer) {
      return NextResponse.json(
        { msg: "No reviewer found for this task" },
        { status: 404 }
      );
    }

    const token = await encode({
      token: {
        name: reviewer.name,
        email: reviewer.email,
        sub: reviewer.id,
        id: reviewer.id,
        role: reviewer.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    const sessionTokenCookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    const cookieOptions = [
      `${sessionTokenCookieName}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${24 * 60 * 60}`,
    ];

    if (process.env.NODE_ENV === "production") {
      cookieOptions.push("Secure");
    }

    const userSession = {
      user: {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        role: reviewer.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const sessionCookieOptions = [
      `next-auth.session=${encodeURIComponent(JSON.stringify(userSession))}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${24 * 60 * 60}`,
    ];

    if (process.env.NODE_ENV === "production") {
      sessionCookieOptions.push("Secure");
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUrl = new URL(`/task/${taskId}`, baseUrl).toString();

    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.append("Set-Cookie", cookieOptions.join("; "));
    redirectResponse.headers.append(
      "Set-Cookie",
      sessionCookieOptions.join("; ")
    );

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
