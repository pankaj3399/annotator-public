import { getTasksByProject } from "@/app/actions/task";
import { NextRequest, NextResponse } from "next/server";

interface Task {
    _id: string;
    name: string;
    project: string;
    content: string;
    created_at: string;
    status: string;
    submitted: boolean;
    annotator?: string;
    feedback: string;
}

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter');

    if (!projectId) {
      return NextResponse.json(
        { msg: "Project ID is required" },
        { status: 400 }
      );
    }

    const response = await getTasksByProject(projectId);
    const tasks: Task[] = JSON.parse(response);

    let filteredTasks: Task[] = [];
    switch (filter) {
      case 'submitted':
        filteredTasks = tasks.filter(task => task.submitted);
        break;
      case 'rejected':
        filteredTasks = tasks.filter(task => task.status === 'rejected');
        break;
      case 'newTask':
        filteredTasks = tasks.filter(task => !task.submitted);
        break;
      default:
        filteredTasks = tasks;
        break;
    }

    return NextResponse.json(filteredTasks, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching tasks by project:", error);
    return NextResponse.json(
      {
        msg: "Error while fetching tasks by projects",
        error: error,
      },
      { status: 500 }
    );
  }
}
