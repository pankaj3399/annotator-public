// models/ResetToken.ts
import mongoose, { Schema, model, models } from "mongoose";

const resetTokenSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
    },
  }
);

// Create an index to automatically expire documents
resetTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const ResetToken = models?.ResetToken || model("ResetToken", resetTokenSchema);