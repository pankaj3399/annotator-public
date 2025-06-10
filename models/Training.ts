// src/models/Training.ts
import mongoose, { Schema, model, models, Document, Types } from "mongoose";

// Define interface for recorded video
interface IRecordedVideo {
  url: string | null;
  uploadedAt: Date | null;
  duration: number | null; // Duration in seconds
}

// Define interface for participant (Customize as needed)
interface IParticipant {
  user: Types.ObjectId; // Ref to User
  joinedAt: Date | null;
  leftAt: Date | null;
}

// Define interface for webinar session (Export if used elsewhere)
export interface IWebinarSession extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  roomId: string | null; // 100ms Room ID
  sessionId?: string | null; 
  scheduledAt: Date | null;
  duration?: number; // Duration in minutes
  status: "scheduled" | "live" | "completed" | "cancelled";
  recordedVideo: IRecordedVideo;
  participants: IParticipant[];
  instructor: Types.ObjectId; // Ref to User model (Project Manager)
  created_at: Date;
  updated_at: Date;
}

// Define interface for the main Training document
export interface ITraining extends Document {
  title: string;
  description?: string;
  project: Types.ObjectId; // Ref to your Project model
  webinars: IWebinarSession[];
  isActive: boolean;
  invitedAnnotators: Types.ObjectId[]; // *** ADDED: Array of invited User ObjectIds ***
  created_at: Date;
  updated_at: Date;
}

const participantSchema = new Schema<IParticipant>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
}, { _id: false });

const webinarSessionSchema = new Schema<IWebinarSession>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  roomId: { type: String, default: null },
  sessionId: { type: String, default: null },
  scheduledAt: { type: Date, default: null },
  duration: { type: Number, default: 60 },
  status: {
    type: String,
    enum: ["scheduled", "live", "completed", "cancelled"],
    default: "scheduled",
  },
  participants: [participantSchema],
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const trainingSchema = new Schema<ITraining>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    project: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    webinars: [webinarSessionSchema], // Embed webinar sessions
    isActive: { type: Boolean, default: true },
    invitedAnnotators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// === OPTIMIZED INDEXES BASED ON SERVER FILE USAGE ===
trainingSchema.index({ _id: 1 }); // For findById and updateOne by _id operations (MongoDB default, but explicit)
trainingSchema.index({ project: 1 }); // For queries filtering by project when doing revalidation path lookups

// Export the model, ensuring it's not re-declared during hot-reloading
export const Training = models?.Training || model<ITraining>("Training", trainingSchema);