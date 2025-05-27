// models/Payment.ts
import mongoose, { Schema, model, models } from "mongoose";
import "./Project";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

const PAYMENT_METHODS_ENUM = [
  'card', 'us_bank_account', 'sepa_debit', 'ideal', 'link', 'giropay',
  'bacs_debit', 'acss_debit', 'au_becs_debit', 'other'
];

const paymentSchema = new Schema(
  {
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      required: true,
      lowercase: true, // This automatically converts to uppercase
      enum: SUPPORTED_CURRENCIES, // Use uppercase enum values
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded", "disputed", "canceled"],
      default: "pending",
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS_ENUM,
      default: "card",
    },
    crossBorderPayment: { type: Boolean, default: false },
    stripeTransferId: { type: String },
    errorMessage: { type: String },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    expertCountry: {
      type: String,
      uppercase: true,
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

// Indexes
paymentSchema.index({ status: 1, created_at: -1 });
paymentSchema.index({ created_at: -1 });
paymentSchema.index({ projectManager: 1, status: 1, created_at: -1 });
paymentSchema.index({ expert: 1, status: 1, created_at: -1 });

paymentSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export const Payment = models?.Payment || model("Payment", paymentSchema);