// src/app/api/hms/recordings/[webinarId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRecordingPresignedUrl } from '@/services/hmsRecording';
import { connectToDatabase } from '@/lib/db';
import { Training } from '@/models/Training';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/auth';
import { isAnnotator, isProjectManager } from '@/lib/userRoles';

export async function GET(
  req: NextRequest,
  { params }: { params: { webinarId: string } }
) {
  try {
    // 1. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the webinar ID from the route params
    const { webinarId } = params;
    if (!webinarId || !mongoose.Types.ObjectId.isValid(webinarId)) {
      return NextResponse.json({ error: 'Invalid webinar ID' }, { status: 400 });
    }

    console.log(`Processing recording request for webinar: ${webinarId}`);
    
    // 3. Connect to database
    await connectToDatabase();

    // 4. Find the webinar and check permissions - with specific projection
    const training = await Training.findOne(
      { "webinars._id": new mongoose.Types.ObjectId(webinarId) },
      { 
        "webinars.$": 1,
        "_id": 1,
        "invitedAnnotators": 1,
        "projectId": 1
      }
    ).lean();

    if (!training) {
      return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
    }

    // Use TypeScript type assertions to help with type checking
    const trainingDoc = training as {
      _id: mongoose.Types.ObjectId;
      webinars?: Array<{
        _id: mongoose.Types.ObjectId;
        roomId?: string;
        title?: string;
        status?: string;
      }>;
      invitedAnnotators?: mongoose.Types.ObjectId[];
    };

    // Check if webinars array exists and has elements
    if (!trainingDoc.webinars || trainingDoc.webinars.length === 0) {
      return NextResponse.json({ error: 'Webinar not found in training document' }, { status: 404 });
    }

    const webinar = trainingDoc.webinars[0];
    const roomId = webinar.roomId;
    
    if (!roomId) {
      return NextResponse.json({ error: 'Webinar has no room ID' }, { status: 400 });
    }

    console.log(`Processing recording for room ID: ${roomId}`);

    const user = session.user as { id: string; role: string };

    // 5. Check user permissions
    // Allow only project managers and invited annotators
    const isProjectManagerCheck = isProjectManager(user.role);
    const isInvitedAnnotator = isAnnotator(user.role) && 
      trainingDoc.invitedAnnotators?.some(id => id.toString() === user.id);
    
    if (!isProjectManagerCheck && !isInvitedAnnotator) {
      return NextResponse.json({ 
        error: 'Not authorized to view this recording' 
      }, { status: 403 });
    }

    // 6. Get the presigned URL from HMS
    console.log(`Getting presigned URL for room: ${roomId}`);
    const presignedUrl = await getRecordingPresignedUrl(roomId);
    
    if (!presignedUrl) {
      console.log(`No recording found on HMS for room: ${roomId}`);
      return NextResponse.json({ 
        error: 'Recording not available yet. Please make sure the webinar has been completed and recorded.' 
      }, { status: 404 });
    }

    console.log(`Successfully retrieved presigned URL for room: ${roomId}`);

    // 7. Return the presigned URL
    return NextResponse.json({ url: presignedUrl });

  } catch (error: any) {
    console.error('Error processing recording request:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing the recording' }, 
      { status: 500 }
    );
  }
}