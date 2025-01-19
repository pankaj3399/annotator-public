import { updateTask } from "@/app/actions/task";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { template, _id, projectid, time } = body;
    if (!_id || !projectid || !time || !template) {
      return NextResponse.json(
        { msg: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await updateTask(template, _id, projectid, time);

    return NextResponse.json(
      { msg: "Task updated successfully", task: JSON.parse(result) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in API /task/update:", error);
    return NextResponse.json(
      { msg: "Failed to update task", error: error },
      { status: 500 }
    );
  }
}
