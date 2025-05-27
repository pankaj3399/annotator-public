// User.ts - Minimal version
import { SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES } from "@/lib/constants";
import mongoose, { Schema, model, models } from "mongoose";




const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    domain: [
      {
        type: String,
        default: [],
      },
    ],
    location: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    isReadyToWork: {
      type: Boolean,
      default: false,
    },
    lang: [
      {
        type: String,
        default: [],
      },
    ],
    role: {
      type: String,
      enum: ["project manager", "annotator", "system admin", "agency owner", "data scientist"],
      required: true,
    },
    invitation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
    },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EnrolledCourse",
      },
    ],
    linkedin: {
      type: String,
      default: null,
    },
    resume: {
      type: String,
      default: null,
    },
    nda: {
      type: String,
      default: null,
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    permission: {
      type: [String],
      enum: ["canReview"],
      default: [],
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    
    // === ESSENTIAL STRIPE CONNECT FIELDS ===
    stripeAccountId: {
      type: String,
      default: null,
      index: true,
    },
    stripeAccountStatus: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'incomplete'],
      default: null,
    },
    stripeAccountCountry: {
      type: String,
      enum: SUPPORTED_COUNTRIES,
      default: null,
      uppercase: true,
    },
    stripeOnboardingComplete: {
      type: Boolean,
      default: false,
    },
    
    // === OPTIONAL: For currency preferences ===
    preferredCurrency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      default: 'usd',
      lowercase: true,
    },
    
    // === STRIPE CUSTOMER FIELDS (for project managers) ===
    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
    },
    defaultPaymentMethod: {
      type: String,
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
    minimize: false,
  }
);

// === ESSENTIAL INDEXES ===
userSchema.index({ role: 1 });
userSchema.index({ team_id: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ created_at: -1 });
userSchema.index({ stripeAccountStatus: 1 });
userSchema.index({ stripeAccountCountry: 1 });

userSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export const User = models?.User || model("User", userSchema);
