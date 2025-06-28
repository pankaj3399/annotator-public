//app/api/projects/[projectId]/guidelines/pm-ai-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { Project } from '@/models/Project';
import mongoose from 'mongoose';

// Define the ProviderAIModel schema (same as in your actions file)
const ProviderAIModelSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  model: { type: String, required: true },
  provider: { type: String, required: true },
  apiKey: { type: String, required: true },
  systemPrompt: { type: String, default: '' },
  lastUsed: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ProviderAIModel = mongoose.models.ProviderAIModel || 
  mongoose.model('ProviderAIModel', ProviderAIModelSchema);

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const aiProvider = url.searchParams.get('provider');
    const aiModel = url.searchParams.get('model');

    if (!aiProvider || !aiModel) {
      return NextResponse.json({ 
        error: 'Missing provider and model parameters' 
      }, { status: 400 });
    }

    console.log('[PM AI Config] Looking for PM model:', { 
      projectId: params.projectId, 
      aiProvider, 
      aiModel 
    });

    // Get project to find the project manager
    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    console.log('[PM AI Config] Project manager ID:', project.project_Manager);

    // Find the PM's AI model that matches the provider and model
    const pmAiModel = await ProviderAIModel.findOne({
      user: project.project_Manager,
      provider: aiProvider,
      model: aiModel
    });

    if (!pmAiModel) {
      console.log('[PM AI Config] ❌ PM AI model not found');
      return NextResponse.json({ 
        success: false, 
        error: 'Project manager AI model not found' 
      }, { status: 404 });
    }

    console.log('[PM AI Config] ✅ Found PM AI model:', {
      id: pmAiModel._id,
      name: pmAiModel.name,
      provider: pmAiModel.provider,
      model: pmAiModel.model,
      hasApiKey: !!pmAiModel.apiKey
    });

    return NextResponse.json({ 
      success: true,
      aiModel: {
        id: pmAiModel._id,
        name: pmAiModel.name,
        provider: pmAiModel.provider,
        model: pmAiModel.model,
        apiKey: pmAiModel.apiKey,
        systemPrompt: pmAiModel.systemPrompt
      }
    });

  } catch (error) {
    console.error('[PM AI Config] Error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to get PM AI config" },
      { status: 500 }
    );
  }
}