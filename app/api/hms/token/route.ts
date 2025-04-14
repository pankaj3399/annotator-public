// src/app/api/hms/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Training, ITraining } from '@/models/Training'; // Adjust path, Assuming ITraining includes IWebinarSession
import { connectToDatabase } from '@/lib/db'; // Adjust path
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Define or import your UserRole type consistently
type UserRole = "project manager" | "annotator" | "agency owner" | "system admin";

// --- Define expected shape after .lean() ---
interface LeanedTrainingDoc {
    _id: Types.ObjectId;
    webinars?: (Partial<ITraining['webinars'][number]> & { _id: Types.ObjectId, roomId?: string | null })[];
    invitedAnnotators?: Types.ObjectId[];
}
// --- End expected shape ---


// --- 100ms API Configuration ---
const APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY;
const APP_SECRET = process.env.HMS_APP_SECRET;

console.log(`[🚀 API Config] /api/hms/token: APP_ACCESS_KEY_PRESENT = ${!!APP_ACCESS_KEY}`);
if (!APP_ACCESS_KEY || !APP_SECRET) {
    console.error("❌❌❌ [API Config Error] /api/hms/token: HMS_APP_ACCESS_KEY or HMS_APP_SECRET environment variable is NOT set! ❌❌❌");
}
// --- End Configuration ---

export async function POST(req: NextRequest) {
    const SEPARATOR = "========================================================================";
    console.log(`\n${SEPARATOR}`);
    console.log("🚀 [API Request Start] /api/hms/token: Received POST request.");
    console.log(SEPARATOR);

    if (!APP_ACCESS_KEY || !APP_SECRET) {
        console.error("❌ [API Error] /api/hms/token: App credentials (KEY/SECRET) missing. Cannot generate token.");
        console.log(SEPARATOR);
        return NextResponse.json({ error: 'Server configuration error: Missing app credentials.' }, { status: 500 });
    }

    let roomId: string | null = null;
    let webinarSessionIdForLog: string | null = null;
    let trainingIdForLog: string | null = null;
    let userId: string | null = null;
    let userRole: UserRole | null = null;

    try {
        await connectToDatabase();
        console.log("✅ [API Info] /api/hms/token: Database connected.");

        const body = await req.json();
        userId = body.userId;
        userRole = body.userRole;
        webinarSessionIdForLog = body.webinarSessionId;

        console.log("📥 [API Info] /api/hms/token: Received request body:", { userId, userRole, webinarSessionId: webinarSessionIdForLog });

        // Input Validation
        if (!userId || !userRole || !webinarSessionIdForLog || !mongoose.Types.ObjectId.isValid(webinarSessionIdForLog)) {
             console.warn("⚠️ [API Warn] /api/hms/token: Invalid input received:", { userId, userRole, webinarSessionId: webinarSessionIdForLog });
             throw new Error("Invalid input: Missing or invalid userId, userRole, or webinarSessionId.");
        }

        // 1. Find WebinarSession & Room ID
        console.log(`🔍 [API Info] /api/hms/token: Finding webinar in DB using webinarSessionId: ${webinarSessionIdForLog}`);
        const trainingDoc = await Training.findOne(
            { "webinars._id": new mongoose.Types.ObjectId(webinarSessionIdForLog) },
            { "webinars.$": 1 , "invitedAnnotators": 1, "_id": 1 }
        ).lean<LeanedTrainingDoc>();

        if (!trainingDoc) {
            console.warn(`⚠️ [API Warn] /api/hms/token: No Training document found containing webinar session ID ${webinarSessionIdForLog}.`);
            throw new Error("Webinar session not found");
        }
        trainingIdForLog = trainingDoc._id.toString();
        console.log(`✅ [API Info] /api/hms/token: Found parent Training document ${trainingIdForLog}`);
        const webinar = trainingDoc.webinars?.[0];
        if (!webinar) {
            console.warn(`⚠️ [API Warn] /api/hms/token: Webinar array empty for session ID ${webinarSessionIdForLog} in Training doc ${trainingIdForLog}.`);
            throw new Error("Webinar session data inconsistency");
        }
        console.log(`✅ [API Info] /api/hms/token: Found webinar details in Training document ${trainingIdForLog}:`, webinar);
        if (!webinar.roomId || typeof webinar.roomId !== 'string') {
            console.error(`❌ [API Error] /api/hms/token: Webinar room ID (roomId) is missing or not a string for session ${webinarSessionIdForLog} in Training doc ${trainingIdForLog}. Found: ${webinar.roomId}`);
            throw new Error("Webinar room configuration missing");
        }
        roomId = webinar.roomId;
        console.log(`✅ [API Info] /api/hms/token: Using 100ms Room ID: ${roomId} for webinar session ${webinarSessionIdForLog}`);

        // --- 2. Map App Role to 100ms Role & Authorize Annotator ---
        console.log(`⚙️ [API Info] /api/hms/token: Determining HMS role for user ${userId} (app role: ${userRole})`);
        let hmsRole: string;
        // ============ ROLE CHANGE ============
        if (userRole === 'project manager') {
            hmsRole = 'broadcaster'; // Use 'broadcaster' for project manager
        } else if (userRole === 'annotator') {
            console.log(`🔒 [API Info] /api/hms/token: Checking invitation status for annotator ${userId} in Training ${trainingIdForLog}`);
            const invitedAnnotators = trainingDoc.invitedAnnotators;
            const isInvited = invitedAnnotators?.some(invitedId => invitedId.equals(userId!));
            console.log(`[API Info] /api/hms/token: Is annotator ${userId} invited? ${isInvited}`);
            if (!isInvited) {
                 console.warn(`⚠️ [API Warn] /api/hms/token: Annotator ${userId} denied token: Not found in invitedAnnotators list for training ${trainingIdForLog}`);
                 throw new Error("You are not invited to this training webinar.");
            }
            hmsRole = 'viewer'; // Keep 'viewer' for annotator
            console.log(`✅ [API Info] /api/hms/token: Annotator ${userId} is invited, assigning HMS role 'viewer'.`);
        } else {
             console.warn(`⚠️ [API Warn] /api/hms/token: User role '${userRole}' is not permitted for webinars.`);
             throw new Error("Your role cannot join this webinar");
        }
        // =====================================
        console.log(`✅ [API Info] /api/hms/token: Mapped user role '${userRole}' to HMS role '${hmsRole}'`);

        // --- 3. Generate Auth Token via JWT Signing ---
        console.log(`🔑 [API Info] /api/hms/token: Generating Auth Token directly using JWT signing.`);
        const payload = {
            access_key: APP_ACCESS_KEY,
            room_id: roomId,
            user_id: userId,
            role: hmsRole, // Use the potentially updated hmsRole
            type: 'app',
            version: 2,
            iat: Math.floor(Date.now() / 1000),
            nbf: Math.floor(Date.now() / 1000)
        };
        console.log("   JWT Payload:", payload);

        const authToken = await new Promise<string>((resolve, reject) => {
            jwt.sign(
                payload,
                APP_SECRET!,
                {
                    algorithm: 'HS256',
                    expiresIn: '24h',
                    jwtid: uuidv4()
                },
                (err, token) => {
                    if (err || !token) {
                        console.error("❌ [API Error] /api/hms/token: Failed during JWT signing:", err);
                        reject(new Error("Failed to generate authentication token."));
                    } else {
                        resolve(token);
                    }
                }
            );
        });

        console.log(`🔑✅ [API Success] /api/hms/token: Generated 100ms Auth Token via JWT for user ${userId}, role ${hmsRole}, room ${roomId}`);
        console.log(SEPARATOR);
        return NextResponse.json({ authToken: authToken });

    // ========== CATCH BLOCK ==========
    } catch (error: any) {
        console.error(`❌❌❌ [API Catch] /api/hms/token: Error occurred processing request for webinarSessionId '${webinarSessionIdForLog || 'unknown'}' (Training ID: ${trainingIdForLog || 'unknown'}):`, error);

        let errorMessage = 'An unexpected error occurred while preparing the webinar.';
        let status = 500;

        if (error instanceof Error) {
            errorMessage = error.message;
            if (errorMessage.startsWith("Invalid input")) status = 400;
            else if (errorMessage === "Webinar session not found") status = 404;
            else if (errorMessage === "Webinar room configuration missing") { status = 500; errorMessage = "Webinar setup incomplete on server."; }
            else if (errorMessage === "You are not invited to this training webinar.") status = 403;
            else if (errorMessage === "Your role cannot join this webinar") status = 403;
            else if (errorMessage === "Failed to generate authentication token.") status = 500;
        }

        console.error(` GIVING UP ❌ [API Response Error] /api/hms/token: Responding to client with status ${status} and error message: "${errorMessage}"`);
        console.log(SEPARATOR);
        return NextResponse.json({ error: errorMessage }, { status: (status >= 200 && status < 600) ? status : 500 });
    }
    // ===============================
}