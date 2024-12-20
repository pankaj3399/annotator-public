import { getTask } from "@/app/actions/task";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      {
        msg: "Unauthorized",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const { taskId } = params;
    if (!taskId) {
      return NextResponse.json(
        {
          msg: "Task ID is required",
        },
        {
          status: 400,
        } // Use 400 for "Bad Request"
      );
    }
    const response = await getTask(taskId);
    const task = JSON.parse(response);
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        msg: "Error while fetching the task",
      },
      {
        status: 500,
      }
    );
  }
}
