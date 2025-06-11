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

// === OPTIMIZED INDEXES BASED ON SERVER FILE USAGE ===
teamSchema.index({ name: 1 }); // For unique constraint

teamSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export const Team = models?.Team || model("Team", teamSchema);