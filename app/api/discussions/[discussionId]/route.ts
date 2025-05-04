// app/api/projects/[id]/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Get project details by ID
export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.projectId;

    // Connect to database
    await connectToDatabase();

    // Fetch project
    const project = await Project.findById(projectId)
      .populate('project_Manager', 'name email');

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}