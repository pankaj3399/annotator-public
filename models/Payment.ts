import mongoose, { Schema, model, models } from "mongoose";

const paymentSchema = new Schema(
  {
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false, // Allow null for direct payments
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "us_bank_account", "sepa_debit", "ideal", "link", "other"],
      default: "card",
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

export const Payment = models?.Payment || model("Payment", paymentSchema);