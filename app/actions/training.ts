// src/actions/trainingActions.ts
'use server';

import { Training, IWebinarSession } from '@/models/Training'; // Adjust path
import mongoose, { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db'; // Adjust path
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth'; // Adjust path
import {
  getWebinarInvitationTemplate,
  sendEmail,
  WebinarDetails,
} from '@/lib/email';

// --- 100ms API Configuration ---
const HMS_API_BASE_URL =
  process.env.HMS_API_BASE_URL || 'https://api.100ms.live/v2';
const MANAGEMENT_TOKEN = process.env.HMS_MANAGEMENT_TOKEN;
const TEMPLATE_ID = process.env.HMS_TEMPLATE_ID;
// --- End Configuration ---

interface CreateWebinarArgs {
  trainingId?: string; // Optional: Will be undefined/null if creating the first webinar
  projectId: string; // Required: Needed to associate if creating new Training doc
  title: string;
  description?: string;
  duration?: number;
  scheduledAt?: Date;
  instructorId: string; // Logged-in PM's user ID
}

interface MultiAnnotatorInviteArgs {
  trainingId: string;
  webinarId: string;
  annotatorIds: string[];
  emails: string[];
  customMessage?: string;
  webinarDetails: WebinarDetails;
}
/**
 * Server Action to create a 100ms room and add a WebinarSession.
 * If trainingId is provided, it adds to that Training document.
 * If trainingId is missing, it creates a new Training document for the projectId.
 */
export async function createWebinarAction(
  args: CreateWebinarArgs
): Promise<{ success: boolean; message: string; webinarId?: string }> {
  console.log('[Action Start] createWebinarAction triggered with args:', args);

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'project manager') {
    console.warn('[Action Denied] User is not a project manager.');
    return { success: false, message: 'Permission denied.' };
  }

  // Validate required ENV vars
  if (!MANAGEMENT_TOKEN) {
    console.error('[Action Error] Missing MANAGEMENT_TOKEN');
    return {
      success: false,
      message: 'Server config error: Missing API token.',
    };
  }
  if (!TEMPLATE_ID) {
    console.error('[Action Error] Missing TEMPLATE_ID');
    return {
      success: false,
      message: 'Server config error: Missing template ID.',
    };
  }

  // Validate IDs if provided
  if (args.trainingId && !mongoose.Types.ObjectId.isValid(args.trainingId)) {
    console.warn(
      '[Action Warn] Invalid trainingId format provided:',
      args.trainingId
    );
    return { success: false, message: 'Invalid Training ID format.' };
  }
  if (!args.projectId || !mongoose.Types.ObjectId.isValid(args.projectId)) {
    console.warn('[Action Warn] Invalid or missing projectId:', args.projectId);
    return { success: false, message: 'Invalid or missing Project ID.' };
  }
  if (
    !args.instructorId ||
    !mongoose.Types.ObjectId.isValid(args.instructorId)
  ) {
    console.warn(
      '[Action Warn] Invalid or missing instructorId:',
      args.instructorId
    );
    return { success: false, message: 'Invalid or missing Instructor ID.' };
  }

  let createdRoomId: string | null = null;
  let dbOperationSuccessful = false; // Tracks if DB update/create succeeded
  const newWebinarMongoId = new Types.ObjectId(); // Generate ID for the new webinar subdoc

  try {
    await connectToDatabase();
    console.log('[Action Info] Database connected.');

    // --- Step 1: Create 100ms Room (Common for both paths) ---
    const roomPayload = {
      name: args.title || `Webinar ${newWebinarMongoId.toString()}`, // Use webinar title for room name
      description: args.description || `Webinar for Project ${args.projectId}`,
      template_id: TEMPLATE_ID,
    };
    // *** ADDED/ENHANCED LOGGING HERE ***
    console.log(
      '[Action Info] Attempting to create 100ms room with payload:',
      JSON.stringify(roomPayload)
    );
    // *** END LOGGING ***

    const roomResponse = await fetch(`${HMS_API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomPayload),
    });

    // *** ADDED/ENHANCED LOGGING HERE ***
    console.log(
      `[Action Info] 100ms room creation response status: ${roomResponse.status}`
    );
    const responseBodyText = await roomResponse.text(); // Get text first
    console.log(
      `[Action Info] 100ms room creation RAW response body: ${responseBodyText}`
    );
    // *** END LOGGING ***

    if (!roomResponse.ok) {
      console.error(
        `[Action Error] Failed to create 100ms room (${roomResponse.status}). Body: ${responseBodyText}`
      );
      throw new Error(
        `Failed to create webinar room service (${roomResponse.status})`
      );
    }

    // *** ADDED/ENHANCED LOGGING HERE ***
    let newRoomData: any; // Use 'any' temporarily for robust parsing check
    try {
      newRoomData = JSON.parse(responseBodyText); // Parse the text
      console.log(
        '[Action Info] Parsed 100ms room creation success response body:',
        newRoomData
      );
    } catch (parseError) {
      console.error(
        '[Action Error] Failed to parse 100ms success response as JSON.',
        parseError
      );
      throw new Error(
        'Received non-JSON success response from webinar service API.'
      );
    }
    // *** END LOGGING ***

    createdRoomId = newRoomData?.id; // Safely access 'id'
    if (!createdRoomId || typeof createdRoomId !== 'string') {
      // Check type too
      console.error(
        "[Action Error] Valid 'id' (string) missing from 100ms API success response.",
        newRoomData
      );
      throw new Error(
        'Failed to get valid room ID string from webinar service API.'
      );
    }
    // *** ADDED/ENHANCED LOGGING HERE ***
    console.log(
      `[Action Info] Successfully extracted 100ms room ID: ${createdRoomId}`
    );
    // *** END LOGGING ***

    // --- Step 2: Prepare WebinarSession Subdocument (Common) ---
    const newWebinarSessionData = {
      _id: newWebinarMongoId,
      title: args.title,
      description: args.description || '',
      roomId: createdRoomId,
      scheduledAt: args.scheduledAt || null,
      duration: args.duration || 60,
      instructor: new Types.ObjectId(args.instructorId),
      status: 'scheduled' as const,
      recordedVideo: { url: null, uploadedAt: null, duration: null },
      participants: [],
    };
    console.log(
      '[Action Info] Prepared webinar subdocument data:',
      newWebinarSessionData
    );

    // --- Step 3: Database Operation (Conditional) ---
    if (args.trainingId) {
      // --- Path A: Update Existing Training ---
      console.log(
        `[Action Info] Attempting to add webinar ${newWebinarMongoId} to existing Training ${args.trainingId}`
      );
      const updateResult = await Training.updateOne(
        {
          _id: new Types.ObjectId(args.trainingId),
          project: new Types.ObjectId(args.projectId),
        },
        { $push: { webinars: newWebinarSessionData } }
      );

      if (updateResult.matchedCount === 0) {
        console.warn(
          `[Action Warn] Training document not found for ID ${args.trainingId} and Project ${args.projectId}.`
        );
        throw new Error('Training program not found for this project.');
      }
      if (updateResult.modifiedCount === 0) {
        console.warn(
          `[Action Warn] Failed to modify Training document ${args.trainingId} (modifiedCount 0).`
        );
        throw new Error(
          'Failed to add webinar session to the training program.'
        );
      }
      dbOperationSuccessful = true;
      console.log(
        `[Action Success] Successfully added webinar ${newWebinarMongoId} to Training ${args.trainingId}. DB Result:`,
        updateResult
      ); // Log DB result
    } else {
      // --- Path B: Create New Training ---
      console.log(
        `[Action Info] Attempting to create new Training document for project ${args.projectId} with first webinar ${newWebinarMongoId}`
      );
      const newTraining = new Training({
        project: new Types.ObjectId(args.projectId),
        title: args.title || `Training for Project ${args.projectId}`,
        description:
          args.description ||
          `Initial training setup with webinar '${args.title}'`,
        webinars: [newWebinarSessionData],
        invitedAnnotators: [],
        isActive: true,
      });

      const savedTraining = await newTraining.save(); // Capture save result
      dbOperationSuccessful = true;
      const newTrainingId = savedTraining._id;
      console.log(
        `[Action Success] Successfully created new Training document ${newTrainingId} for project ${args.projectId}.`
      );
    }

    // --- Step 4: Revalidate Path (Common) ---
    const revalidationPath = `/projects/${args.projectId}/training`;
    console.log(`[Action Info] Revalidating path: ${revalidationPath}`);
    revalidatePath(revalidationPath, 'page');

    return {
      success: true,
      message: 'Webinar created successfully.',
      webinarId: newWebinarMongoId.toString(),
    };
  } catch (error: any) {
    console.error('[Action Catch] Error in createWebinarAction:', error);

    // --- Cleanup: Disable room if created but DB op failed ---
    if (createdRoomId && !dbOperationSuccessful) {
      console.warn(
        `[Action Cleanup] Attempting to disable created room ${createdRoomId} due to DB/processing error.`
      );
      try {
        const disableResponse = await fetch(
          `${HMS_API_BASE_URL}/rooms/${createdRoomId}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enabled: false }),
          }
        );
        if (disableResponse.ok) {
          console.log(
            `[Action Cleanup] Successfully disabled orphaned room ${createdRoomId}.`
          );
        } else {
          const disableErrorBody = await disableResponse.text();
          console.error(
            `[Action Cleanup CRITICAL] Failed to disable orphaned room ${createdRoomId} (${disableResponse.status}). Body: ${disableErrorBody}`
          );
        }
      } catch (disableError: any) {
        console.error(
          `[Action Cleanup CRITICAL] Exception while trying to disable orphaned room ${createdRoomId}:`,
          disableError.message
        );
      }
    }
    return {
      success: false,
      message: error.message?.includes('webinar room service')
        ? 'Failed to set up webinar service.'
        : error.message || 'Failed to create webinar.',
    };
  }
}

// --- inviteAnnotatorAction (Unchanged from previous correction) ---
export async function inviteAnnotatorAction(
  trainingId: string,
  annotatorId: string
): Promise<{ success: boolean; message: string }> {
  console.log(
    `[Action Start] inviteAnnotatorAction triggered with trainingId: ${trainingId}, annotatorId: ${annotatorId}`
  );
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'project manager') {
    console.warn('[Action Denied] User is not a project manager.');
    return { success: false, message: 'Permission denied.' };
  }
  if (
    !mongoose.Types.ObjectId.isValid(trainingId) ||
    !mongoose.Types.ObjectId.isValid(annotatorId)
  ) {
    console.warn('[Action Warn] Invalid ID format provided.', {
      trainingId,
      annotatorId,
    });
    return { success: false, message: 'Invalid ID format.' };
  }
  try {
    await connectToDatabase();
    console.log('[Action Info] Database connected for invite.');
    const updateResult = await Training.updateOne(
      { _id: new Types.ObjectId(trainingId) },
      { $addToSet: { invitedAnnotators: new Types.ObjectId(annotatorId) } }
    );
    console.log('[Action Info] Invite update result:', updateResult);
    if (updateResult.matchedCount === 0) {
      console.warn(
        `[Action Warn] Training not found for ID ${trainingId} during invite.`
      );
      return { success: false, message: 'Training not found.' };
    }
    if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
      console.log(
        `[Action Info] Annotator ${annotatorId} was already invited to training ${trainingId}.`
      );
      return { success: true, message: 'Annotator already invited.' };
    }
    console.log(
      `[Action Success] Invited annotator ${annotatorId} to training ${trainingId}`
    );
    interface TrainingWithProject {
      project: Types.ObjectId;
    }
    const trainingDoc = await Training.findById(trainingId, {
      project: 1,
    }).lean<TrainingWithProject>();
    if (trainingDoc && trainingDoc.project) {
      const revalidationPath = `/projects/${trainingDoc.project.toString()}/training`;
      console.log(`[Action Info] Revalidating path: ${revalidationPath}`);
      revalidatePath(revalidationPath, 'page');
    } else {
      console.warn(
        `[Action Warn] Could not determine projectId for revalidation from trainingId ${trainingId}`
      );
    }
    return { success: true, message: 'Expert invited successfully.' };
  } catch (error: any) {
    console.error('[Action Catch] Error inviting expert:', error);
    return {
      success: false,
      message: 'Failed to invite expert due to a server error.',
    };
  }
}

export async function inviteMultipleAnnotatorsAction(
  args: MultiAnnotatorInviteArgs
): Promise<{ success: boolean; message: string; invitedCount?: number }> {
  console.log(
    '[Action Start] inviteMultipleAnnotatorsAction triggered with args:',
    {
      trainingId: args.trainingId,
      webinarId: args.webinarId,
      annotatorCount: args.annotatorIds.length,
      emailCount: args.emails.length,
    }
  );

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'project manager') {
    console.warn('[Action Denied] User is not a project manager.');
    return { success: false, message: 'Permission denied.' };
  }

  // Validate training ID
  if (!mongoose.Types.ObjectId.isValid(args.trainingId)) {
    console.warn('[Action Warn] Invalid trainingId format:', args.trainingId);
    return { success: false, message: 'Invalid Training ID format.' };
  }

  // Validate annotator IDs
  const validAnnotatorIds = args.annotatorIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );

  if (validAnnotatorIds.length === 0) {
    console.warn('[Action Warn] No valid annotator IDs provided.');
    return { success: false, message: 'No valid annotator IDs provided.' };
  }

  try {
    await connectToDatabase();
    console.log('[Action Info] Database connected for multi-invite.');

    // Convert valid IDs to ObjectIds
    const annotatorObjectIds = validAnnotatorIds.map(
      (id) => new Types.ObjectId(id)
    );

    // Update training document to add annotators
    const updateResult = await Training.updateOne(
      { _id: new Types.ObjectId(args.trainingId) },
      { $addToSet: { invitedAnnotators: { $each: annotatorObjectIds } } }
    );

    console.log('[Action Info] Multi-invite update result:', updateResult);

    if (updateResult.matchedCount === 0) {
      console.warn(
        `[Action Warn] Training not found for ID ${args.trainingId} during multi-invite.`
      );
      return { success: false, message: 'Training not found.' };
    }

    // Get training document with project for revalidation path
    interface TrainingWithProject {
      project: Types.ObjectId;
    }
    const trainingDoc = await Training.findById(args.trainingId, {
      project: 1,
    }).lean<TrainingWithProject>();

    // Send emails to all annotators
    if (args.emails && args.emails.length > 0) {
      console.log(
        `[Action Info] Preparing to send ${args.emails.length} invitation emails`
      );

      // Generate HTML template
      const emailHtml = getWebinarInvitationTemplate(
        args.webinarDetails,
        args.customMessage
      );

      // Send email to all recipients at once
      const emailResult = await sendEmail({
        to: args.emails,
        subject: `Training Webinar Invitation: ${args.webinarDetails.title}`,
        html: emailHtml,
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      });

      if (!emailResult.success) {
        console.warn(
          '[Action Warn] Failed to send invitation emails:',
          emailResult.error
        );
        // We don't fail the entire action if emails fail, but log the issue
      } else {
        console.log(
          `[Action Success] Invitation emails sent successfully. MessageId: ${emailResult.messageId}`
        );
      }
    }

    // Revalidate page
    if (trainingDoc && trainingDoc.project) {
      const revalidationPath = `/projects/${trainingDoc.project.toString()}/training`;
      console.log(`[Action Info] Revalidating path: ${revalidationPath}`);
      revalidatePath(revalidationPath, 'page');
    } else {
      console.warn(
        `[Action Warn] Could not determine projectId for revalidation from trainingId ${args.trainingId}`
      );
    }

    return {
      success: true,
      message: `Successfully invited ${validAnnotatorIds.length} annotator${
        validAnnotatorIds.length !== 1 ? 's' : ''
      } to the training.`,
      invitedCount: validAnnotatorIds.length,
    };
  } catch (error: any) {
    console.error(
      '[Action Catch] Error in inviteMultipleAnnotatorsAction:',
      error
    );
    return {
      success: false,
      message:
        error.message || 'Failed to invite experts due to a server error.',
    };
  }
}
