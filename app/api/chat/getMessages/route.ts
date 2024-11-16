// app/api/projects/route.ts
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Message, UserGroup } from '@/models/chat';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const searchParams = req.nextUrl.searchParams
  const groupId = searchParams.get('groupId')
  const limitBefore = Number(searchParams.get('limitBefore')) || 0
  const limitAfter = Number(searchParams.get('limitAfter')) || 20
  const messageId = searchParams.get('messageId') || null
  const session = await getServerSession(authOptions)

  try {
    if (messageId) {
      const referenceMessage = await Message.findById(messageId);

      const messagesBefore = await Message.find({
        group: groupId,
        sent_at: { $lt: referenceMessage.sent_at }
      })
        .sort({ sent_at: -1 })
        .limit(Number(limitBefore))
        .populate('sender', 'name ');

      return NextResponse.json({ success: true, messages: messagesBefore.reverse() }, { status: 200 });
    }

    const userGroup = await UserGroup.findOne({ group: groupId, user: session?.user.id });

    if (!userGroup || !userGroup.lastReadMessage) {
      const recentMessages = await Message.find({ group: groupId })
        .sort({ sent_at: -1 })
        .limit(limitAfter)
        .populate('sender', 'name ');

      return NextResponse.json({ success: true, messages: recentMessages.reverse() }, { status: 200 });
    }

    const lastReadMessage = await Message.findById(userGroup.lastReadMessage);

    if (limitBefore === 0) {
      const messagesAfter = await Message.find({
        group: groupId,
        sent_at: { $gt: lastReadMessage.sent_at }
      })
        .sort({ sent_at: 1 })
        .limit(Number(limitAfter))
        .populate('sender', 'name ');
      return NextResponse.json({ success: true, messages: messagesAfter }, { status: 200 });
    }

    const messagesBefore = await Message.find({
      group: groupId,
      sent_at: { $lt: lastReadMessage.sent_at }
    })
      .sort({ sent_at: -1 })
      .limit(Number(limitBefore))
      .populate('sender', 'name ');

    const messagesAfter = await Message.find({
      group: groupId,
      sent_at: { $gte: lastReadMessage.sent_at }
    })
      .sort({ sent_at: 1 })
      .limit(Number(limitAfter))
      .populate('sender', 'name ');

    const combinedMessages = [...messagesBefore.reverse(), ...messagesAfter];

    return NextResponse.json({ success: true, messages: combinedMessages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 400 });
  }
}

