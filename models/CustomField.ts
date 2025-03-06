import mongoose, { Schema, model, models } from "mongoose";

const customFieldSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "link", "file", "array"],
      required: true,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    acceptedFileTypes: {
      type: String,
      default: null, // For file type fields, e.g., ".pdf,.doc,.docx"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    }],
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

export const CustomField = models?.CustomField || model("CustomField", customFieldSchema);