// app/api/discussions/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { isAnnotator, isProjectManager } from '@/lib/userRoles';
import { Discussion } from '@/models/Discussion';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Get all discussions or filter by project with role-based access control
export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const projectId = url.searchParams.get('project');

    // Connect to database
    await connectToDatabase();

    // Get current user details including team_id
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare query filter
    const filter: any = {};
    
    // Filter by project if specified
    if (projectId) {
      filter.project = projectId;
    }

    // Apply role-based filters
    if (isAnnotator(session.user.role)) {
      // Show all discussions from team members regardless of role
      if (currentUser.team_id) {
        // Find all users in the same team
        const teamMembers = await User.find({
          team_id: currentUser.team_id
        }).select('_id');
        
        const teamMemberIds = teamMembers.map(member => member._id);
        
        // Show discussions from all team members
        filter.author = { $in: teamMemberIds };
      }
    } else if (isProjectManager(session.user.role)) {
      // Project managers can see all discussions they create and public/internal from their team
      filter.$or = [
        { author: session.user.id }, // All discussions they created
        { visibility: { $in: ['public', 'internal'] } } // Public and internal discussions
      ];
      
      if (projectId) {
        filter.project = projectId;
      }
    }
    // System admins can see everything (no additional filters)

    // Fetch discussions with sorting
    const discussions = await Discussion.find(filter)
      .sort({ created_at: -1 })
      .populate('author', 'name role team_id')
      .populate('project', 'name')
      .populate('comments.author', 'name role');

    return NextResponse.json({
      success: true,
      discussions
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new discussion
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Parse request body
    const { title, content, project, tags, visibility } = await req.json();

    // Validate required fields
    if (!title || !content || !project) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new discussion
    const newDiscussion = new Discussion({
      title,
      content,
      project,
      author: session.user.id,
      tags: tags || [],
      visibility: visibility || 'public',
      likes: [],
      comments: [],
      created_at: new Date(),
      updated_at: new Date()
    });

    // Save the discussion
    await newDiscussion.save();

    // Populate the author and project fields for the response
    const populatedDiscussion = await Discussion.findById(newDiscussion._id)
      .populate('author', 'name role team_id')
      .populate('project', 'name');

    // Add computed fields for UI
    const discussion = populatedDiscussion.toObject();
    discussion.likeCount = discussion.likes.length;
    discussion.commentCount = discussion.comments.length;

    return NextResponse.json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Error creating discussion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}