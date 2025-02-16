// app/api/projects/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const selectedLabels = searchParams.get('labels')?.split(',').filter(Boolean);

  try {
    let query: any = { project_Manager: session.user.id };
    
    // Add labels filter if provided
    if (selectedLabels && selectedLabels.length > 0) {
      query.labels = { $all: selectedLabels }; // Ensures all selected labels are present
    }

    if (projectId) {
      const project = await Project.findById(projectId).populate('templates');
      return NextResponse.json({ success: true, project }, { status: 200 });
    }

    const projects = await Project.find(query)
      .populate('templates')
      .sort({ created_at: -1 });

    return NextResponse.json({ success: true, projects }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch projects' 
    }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { name, earnings_per_task = 0 } = await req.json();

    // Validate earnings_per_task
    const parsedEarnings = parseFloat(earnings_per_task);
    if (isNaN(parsedEarnings) || parsedEarnings < 0) {
      return NextResponse.json({
        success: false,
        error: 'Earnings per task must be a positive number'
      }, { status: 400 });
    }

    // Create new project with earnings_per_task
    const newProject = await Project.create({
      name,
      project_Manager: session.user.id,
      earnings_per_task: parsedEarnings
    });

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project'
    }, { status: 400 });
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
    await Project.findOneAndDelete({ _id: _id });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 400 });
  }
}