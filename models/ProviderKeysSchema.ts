import mongoose, { Schema, model, models } from "mongoose";

// Schema for provider keys
const providerKeysSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        transcriptionProviders: {
            type: Map,
            of: {
                apiKey: String,
                lastUsed: Date,
                isActive: {
                    type: Boolean,
                    default: true
                }
            },
            default: {},
        },
        translationProviders: {
            type: Map,
            of: {
                apiKey: String,
                lastUsed: Date,
                isActive: {
                    type: Boolean,
                    default: true
                }
            },
            default: {},
        },
        created_at: {
            type: Date,
            default: Date.now,
        },
        updated_at: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        minimize: false, // Ensures empty objects are stored
    }
);

providerKeysSchema.pre("save", function (next) {
    this.updated_at = new Date();
    next();
});

// Create a compound index to ensure each user has only one document for provider keys
providerKeysSchema.index({ user_id: 1 }, { unique: true });

export const ProviderKeys = models?.ProviderKeys || model("ProviderKeys", providerKeysSchema);