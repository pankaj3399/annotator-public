// app/api/projects/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // Get the current session to identify the project manager
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  if (projectId) {
    try {
      const project = await Project.findById(projectId).populate('templates');
      return NextResponse.json({ success: true, project }, { status: 200 });
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 400 });
    }
  }
  try {
    const projects = await Project.find({ project_Manager: session.user.id });
    return NextResponse.json({ success: true, projects }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await req.json();
  try {
    await connectToDatabase();
    const newProject = await Project.create({
      name,
      project_Manager: session.user.id,
    });

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { _id } = await req.json();

  try {
    await connectToDatabase();
    await Project.findOneAndDelete({_id: _id});
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 400 });
  }
}
