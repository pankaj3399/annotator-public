// app/api/discussions/[id]/like/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Discussion } from '@/models/Discussion';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// POST - Like/unlike a discussion
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

    // Connect to database
    await connectToDatabase();

    // Find discussion
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    // Toggle like status
    const userLikedIndex = discussion.likes.indexOf(userId);
    
    if (userLikedIndex === -1) {
      // Add like
      discussion.likes.push(userId);
    } else {
      // Remove like
      discussion.likes.splice(userLikedIndex, 1);
    }

    await discussion.save();
    
    // Populate the author and project details before returning
    await discussion.populate('author', 'name role');
    await discussion.populate('project', 'name');

    return NextResponse.json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Error updating discussion like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}