import { NextResponse } from "next/server";
import { getTasksOfAnnotator } from "@/app/actions/task";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";  // Force dynamic behavior for this route

export async function GET(req: Request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { msg: "Unauthorized" },
        { status: 403 }
      );
    }

    // Parse the taskType from query parameters (assuming it's passed via the URL)
    const url = new URL(req.url);
    const taskType = url.searchParams.get("taskType");

    // Validate and narrow taskType to expected values
    if (!taskType || !["core", "training", "test"].includes(taskType)) {
      return NextResponse.json(
        { msg: "Invalid task type" },
        { status: 400 }
      );
    }

    // Fetch tasks using the server action
    const tasks = await getTasksOfAnnotator(taskType as 'core' | 'training' | 'test');  // Narrowing the type here

    // Return the tasks in the response
    return NextResponse.json(JSON.parse(tasks), { status: 200 });
  } catch (error) {
    console.error("Error fetching annotator's tasks:", error);
    return NextResponse.json(
      { msg: "Error fetching annotator's tasks", error: error },
      { status: 500 }
    );
  }
}
