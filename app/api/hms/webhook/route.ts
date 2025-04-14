// src/app/api/hms/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // Adjust path
import { Training } from '@/models/Training'; // Adjust path
import { revalidatePath } from 'next/cache';
import crypto from 'crypto'; // Node.js crypto module

const webhookSecret = process.env.HMS_WEBHOOK_SECRET!;

if (!webhookSecret) {
    console.error("CRITICAL: Missing HMS_WEBHOOK_SECRET environment variable.");
}

// --- Webhook Verification Function ---
function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    if (!signatureHeader) return false;
    try {
        const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader)); // Use timingSafeEqual
    } catch { return false; }
}
// --- End Verification Function ---

export async function POST(req: NextRequest) {
    if (!webhookSecret) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const hmsSignature = req.headers.get('hmssdk-signature');
    const rawBody = await req.text(); // Read body only once

    // --- Perform Manual Verification ---
    if (!verifyWebhookSignature(rawBody, hmsSignature, webhookSecret)) {
         console.error("Webhook verification failed: Invalid signature.");
         return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    // --- Verification Successful ---

    try {
        const event = JSON.parse(rawBody); // Parse verified body
        console.log(`Webhook verified. Type: ${event.type}, ID: ${event.id}`);

        if (event.type === 'recording.success') {
            await connectToDatabase();
            const { room_id, location, duration, timestamp } = event.data; // Adjust fields as needed

            if (!room_id || !location) {
                console.error(`Webhook ${event.id} recording.success missing data.`);
                return NextResponse.json({ message: 'Webhook received, payload incomplete.' }, { status: 200 });
            }

            const updateResult = await Training.updateOne(
                { "webinars.roomId": room_id },
                {
                    $set: {
                        "webinars.$.status": "completed",
                        "webinars.$.recordedVideo.url": location,
                        "webinars.$.recordedVideo.uploadedAt": new Date(timestamp),
                        "webinars.$.recordedVideo.duration": Math.round(duration || 0), // Ensure duration is number
                        "webinars.$.updated_at": new Date()
                    }
                }
            );

             if (updateResult.matchedCount > 0 && updateResult.modifiedCount > 0) {
                 console.log(`Webhook ${event.id}: Updated recording for room ${room_id}.`);
                 // Find the trainingId associated with this webinar for more specific revalidation if possible
                 // For now, revalidate a broader path
                 revalidatePath('/trainings', 'layout'); // Revalidate layout might catch more cases
             } else {
                 console.warn(`Webhook ${event.id}: No update made for room ${room_id} (Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}).`);
             }
        }
        // Handle other events like recording.failed if needed

        return NextResponse.json({ message: 'Webhook received' }, { status: 200 });

    } catch (error: any) {
        console.error(`Error processing verified webhook (${error.message}):`, error);
        // Return 200 OK to 100ms even if processing fails, to avoid retries for potentially unrecoverable errors
        return NextResponse.json({ message: 'Webhook received but processing failed internally.' }, { status: 200 });
    }
}