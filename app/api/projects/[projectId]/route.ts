// app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Get specific project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await Project.findById(params.projectId);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        labels: project.labels
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// Update specific project
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, labels } = await request.json();
    const updateData: { [key: string]: any } = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (labels !== undefined) updateData.labels = labels;

    const project = await Project.findByIdAndUpdate(
      params.projectId,
      updateData,
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        labels: project.labels
      }
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: "Failed to update project" },
      { status: 500 }
    );
  }
}