// app/api/projects/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Message, UserGroup } from '@/models/chat';
import { Project } from '@/models/Project';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions)

  try {
    // update user login time
    User.updateOne({ _id: session?.user.id }, { lastLogin: Date.now() })
    .catch(error => console.error('Error updating lastLogin:', error));
        // Find UserGroups by user and populate all necessary fields
    const userGroups = await UserGroup.find({ user: session?.user.id })
      .populate({
        path: 'group', // Populate group field
        populate: [
          {
            path: 'lastMessage', // Populate lastMessage inside group
            model: Message,
            select: 'content sender sent_at',
            populate: {
              path: 'sender',
              model: User,
              select: 'name ' // Populate sender's name and 
            }
          },
          {
            path: 'projectManager', // Populate project manager inside group
            model: User,
            select: 'name '
          },
          {
            path: 'members', // Populate members inside group
            model: User,
            select: 'name lastLogin' // Populate user info inside group members
          }
        ]
      })
      .populate({
        path: 'lastReadMessage', // Populate lastReadMessage in UserGroup
        select: 'content sender sent_at',
        populate: {
          path: 'sender',
          model: User,
          select: 'name '
        }
      });

    return NextResponse.json({ success: true, userGroups }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 400 });
  }
}

