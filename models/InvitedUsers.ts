// models/InvitedUsers.js
import mongoose, { Schema, model, models } from "mongoose";

const invitedUsersSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    agencyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Ensure we don't invite the same email twice from the same agency owner
invitedUsersSchema.index({ email: 1, agencyOwner: 1 }, { unique: true });

export const InvitedUsers = models?.InvitedUsers || model("InvitedUsers", invitedUsersSchema);