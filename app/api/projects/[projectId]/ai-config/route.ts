// app/api/projects/[projectId]/ai-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { AImodel } from '@/models/aiModel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Get AI configuration for a project
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

    // Find the AI model configuration for this project
    const aiConfig = await AImodel.findOne({
      projectid: params.projectId,
      user: session.user.id
    }).select('provider model apiKey');

    if (!aiConfig) {
      return NextResponse.json({ success: false, error: 'AI configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      config: {
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey: aiConfig.apiKey,
      }
    });
  } catch (error) {
    console.error('Error fetching AI configuration:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch AI configuration" },
      { status: 500 }
    );
  }
}

// Save AI configuration for a project
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { config } = await request.json();
    
    if (!config || !config.provider || !config.model || !config.apiKey) {
      return NextResponse.json(
        { success: false, error: "Complete configuration required" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update or create AI model configuration
    const aiConfig = await AImodel.findOneAndUpdate(
      { projectid: params.projectId, user: session.user.id },
      { 
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        name: `${project.name || 'Guidelines'} AI Assistant` // Default name
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ 
      success: true,
      modelId: aiConfig._id
    });
  } catch (error) {
    console.error('Error saving AI configuration:', error);
    return NextResponse.json(
      { success: false, error: "Failed to save AI configuration" },
      { status: 500 }
    );
  }
}