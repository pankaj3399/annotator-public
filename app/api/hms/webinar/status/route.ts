// src/app/api/hms/webinar/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Training } from '@/models/Training';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/auth';

export async function PUT(req: NextRequest) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check role - only project managers can update status
    const user = session.user as { id: string; role: string };
    if (user.role !== 'project manager') {
      return NextResponse.json({ error: 'Only project managers can update webinar status' }, { status: 403 });
    }

    // 3. Parse request body
    const body = await req.json();
    const { webinarId, status } = body;

    // 4. Validate input
    if (!webinarId || !status) {
      return NextResponse.json({ error: 'Webinar ID and status are required' }, { status: 400 });
    }

    // 5. Validate status value
    const validStatuses = ['scheduled', 'live', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // 6. Connect to database
    await connectToDatabase();

    // 7. Update the webinar status
    const updateResult = await Training.updateOne(
      { "webinars._id": webinarId },
      {
        $set: {
          "webinars.$.status": status,
          "webinars.$.updated_at": new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
    }

    // 8. Revalidate the page to refresh the UI
    revalidatePath('/trainings', 'layout');

    // 9. Return success response
    return NextResponse.json({ 
      success: true, 
      message: `Webinar status updated to ${status}` 
    });

  } catch (error: any) {
    console.error('Error updating webinar status:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while updating webinar status' }, 
      { status: 500 }
    );
  }
}