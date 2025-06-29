// app/api/discussions/[id]/comment/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { isAdmin, isProjectManager } from '@/lib/userRoles';
import { Discussion } from '@/models/Discussion';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// POST - Add a comment to a discussion
export async function POST(
  req: Request,
  { params }: { params: { discussionId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const discussionId = params.discussionId;
    const userId = session.user.id;

    // Parse request body
    const body = await req.json();
    const { content } = body;

    // Validate input
    if (!content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find discussion
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    // Check visibility restrictions
    if (discussion.visibility === 'private' && !isProjectManager(session.user.role) && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Add comment
    discussion.comments.push({
      content,
      author: userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    await discussion.save();
    
    // Populate the author and project details before returning
    await discussion.populate('author', 'name role');
    await discussion.populate('project', 'name');
    
    // Populate comment authors
    await discussion.populate('comments.author', 'name role');

    return NextResponse.json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Error adding comment to discussion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}