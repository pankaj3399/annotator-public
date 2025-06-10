import mongoose, { Schema, model, models } from "mongoose";

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: null,
    },
    logo: {
      type: String,
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Indexes for performance optimization
teamSchema.index({ name: 1 }); // Single field index for unique constraint and searches
teamSchema.index({ createdBy: 1 }); // Index for queries filtering by creator
teamSchema.index({ members: 1 }); // Index for member lookups
teamSchema.index({ created_at: -1 }); // Index for sorting by creation date (newest first)
teamSchema.index({ createdBy: 1, created_at: -1 }); // Compound index for creator's teams sorted by date
teamSchema.index({ members: 1, created_at: -1 }); // Compound index for member's teams sorted by date

teamSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export const Team = models?.Team || model("Team", teamSchema);