import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Project } from '@/models/Project';
import { Guideline } from '@/models/Guideline';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure the user can only access their own data
    if (session.user.id !== params.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Find all projects managed by this user
    const projects = await Project.find({ 
      project_Manager: params.userId 
    }).select('_id');

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        aiModel: null,
        message: 'No projects found for this user'
      });
    }

    const projectIds = projects.map(project => project._id);

    // Use aggregation pipeline to efficiently find the latest AI message
    const result = await Guideline.aggregate([
      // Match guidelines for user's projects
      {
        $match: {
          project: { $in: projectIds }
        }
      },
      // Join with project data to get project name
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectData'
        }
      },
      // Unwind the messages array to work with individual messages
      {
        $unwind: '$messages'
      },
      // Match only AI messages that have provider and model
      {
        $match: {
          'messages.isAiMessage': true,
          'messages.aiProvider': { $exists: true, $ne: null },
          'messages.aiModel': { $exists: true, $ne: null }
        }
      },
      // Sort by message timestamp in descending order (latest first)
      {
        $sort: { 'messages.timestamp': -1 }
      },
      // Take only the latest message
      {
        $limit: 1
      },
      // Project the fields we need
      {
        $project: {
          provider: '$messages.aiProvider',
          model: '$messages.aiModel',
          timestamp: '$messages.timestamp',
          projectName: { $arrayElemAt: ['$projectData.name', 0] },
          projectId: '$project'
        }
      }
    ]);

    // Check if we found any AI messages
    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        aiModel: null,
        message: 'No AI messages found in user projects'
      });
    }

    const latestAIModel = {
      provider: result[0].provider,
      model: result[0].model,
      projectName: result[0].projectName,
      projectId: result[0].projectId,
      timestamp: result[0].timestamp
    };

    return NextResponse.json({
      success: true,
      aiModel: latestAIModel
    });

  } catch (error) {
    console.error('Error fetching latest AI model:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}