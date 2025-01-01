import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getTask } from "@/app/actions/task";
import { getAnnotatorByTaskId } from "@/app/actions/annotatorTask";

export async function POST(req: NextRequest) {
  try {
    // Extract taskId and secretKey from the request
    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");
    const secretKey = req.headers.get("secret-key");

    if (!taskId || !secretKey) {
      return NextResponse.json(
        {
          msg: "taskId or secretKey is missing",
          error: null,
        },
        {
          status: 400,
        }
      );
    }

    // Validate the secret key
    const envSecretKey = process.env.MOBILE_SECRET_KEY;
    if (secretKey !== envSecretKey) {
      return NextResponse.json(
        {
          msg: "Invalid secret key",
          error: null,
        },
        {
          status: 401,
        }
      );
    }

    // Fetch task using taskId
    const task = await getTask(taskId);
    if (!task) {
      return NextResponse.json(
        {
          msg: "No task found for the provided taskId",
          error: null,
        },
        {
          status: 404,
        }
      );
    }

    // Fetch annotator based on task's annotator field
    const response = await getAnnotatorByTaskId(taskId);
    if (response.data) {
      const annotator = JSON.parse(response.data);
      if (!annotator) {
        return NextResponse.json(
          {
            msg: "No annotator found for this task",
            error: null,
          },
          {
            status: 404,
          }
        );
      }

      // Create a JWT token for the annotator
      const token = jwt.sign(
        {
          id: annotator?.data?.id,
          name: annotator?.data?.name,
          email: annotator?.data?.email,
          role: annotator?.data?.role,
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours expiration
        },
        process.env.NEXTAUTH_SECRET!
      );

      // Set the JWT token in a cookie
      const cookie = `next-auth.session-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`;

      // Construct the absolute URL for redirection
      const redirectUrl = `${process.env.NEXTAUTH_URL}/tasks/${taskId}`;

      // Return a successful response with the redirect URL and cookie
      return NextResponse.redirect(redirectUrl, {
        headers: {
          "Set-Cookie": cookie,
        },
      });
    } else {
      return NextResponse.json({
        msg: "Bad request",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        msg: "Error while processing the request",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
