// app/api/projects/[projectId]/settings/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!params.projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  try {
    const project = await Project.findOne({
      _id: params.projectId,
      project_Manager: session.user.id
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        earnings_per_task: project.earnings_per_task || 0
      }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project settings' },
      { status: 400 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!params.projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const earnings_per_task = parseFloat(body.earnings_per_task);

    if (isNaN(earnings_per_task) || earnings_per_task < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid earnings value' },
        { status: 400 }
      );
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: params.projectId,
        project_Manager: session.user.id
      },
      { $set: { earnings_per_task } },
      { new: true }
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update project settings' },
      { status: 400 }
    );
  }
}