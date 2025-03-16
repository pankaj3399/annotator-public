// models/StorageCredentials.ts
import mongoose, { Schema, model, models } from "mongoose";

const storageCredentialsSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storageType: {
      type: String,
      enum: ["s3", "googleDrive"],
      required: true,
    },
    // For S3 - now we'll store user-specific S3 configuration
    s3Config: {
      bucketName: { type: String, default: null },
      region: { type: String, default: null },
      folderPrefix: { type: String, default: null }, // Optional folder structure
    },
    // For Google Drive - using OAuth tokens
    googleDriveConfig: {
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      tokenExpiry: { type: Date, default: null },
      displayName: { type: String, default: null }, // Store user's Google account name
      email: { type: String, default: null }, // Store user's Google email
    },
    // NEW: Add credentials field to store encrypted AWS credentials
    credentials: {
      accessKeyId: { type: String, default: null },     // Will store encrypted AWS access key
      secretAccessKey: { type: String, default: null }, // Will store encrypted AWS secret key
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
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

// Add compound index to ensure a user can only have one active configuration per storage type
storageCredentialsSchema.index({ user_id: 1, storageType: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export const StorageCredentials = models?.StorageCredentials || model("StorageCredentials", storageCredentialsSchema);