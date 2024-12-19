import { NextResponse } from "next/server";
import { getTasksOfAnnotator } from "@/app/actions/task";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { msg: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch tasks using the server action
    const tasks = await getTasksOfAnnotator();

    // Parse and return the response
    return NextResponse.json(JSON.parse(tasks), { status: 200 });
  } catch (error) {
    console.error("Error fetching annotator's tasks:", error);
    return NextResponse.json(
      { msg: "Error fetching annotator's tasks", error: error },
      { status: 500 }
    );
  }
}
