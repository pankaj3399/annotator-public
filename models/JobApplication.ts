// models/JobApplication.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IJobApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  userId: string;
  appliedAt: Date;
  status: "pending" | "accepted" | "rejected";
}

const JobApplicationSchema = new Schema({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: "JobPost",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

// Add a compound index to prevent multiple applications
JobApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export default mongoose.models.JobApplication ||
  mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);
