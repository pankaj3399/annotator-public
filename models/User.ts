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
      enum: ["project manager", "annotator", "system admin"],
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
    minimize: false, // This ensures empty objects are stored
  }
);

userSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export const User = models?.User || model("User", userSchema);