import mongoose from "mongoose";

const EnrolledCourseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  enrollmentStatus: {
    type: String,
    enum: ["active", "completed", "dropped"],
    default: "active",
  },
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  paymentIntent: {
    type: String,
    required: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
  lastAccessDate: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update the lastAccessDate whenever the document is accessed
EnrolledCourseSchema.pre("save", function (next) {
  this.updated_at = new Date();
  this.lastAccessDate = new Date();
  next();
});

// Compound index to ensure a user can't enroll in the same course twice
EnrolledCourseSchema.index({ user: 1, course: 1 }, { unique: true });

const EnrolledCourse =
  mongoose.models?.EnrolledCourse ||
  mongoose.model("EnrolledCourse", EnrolledCourseSchema);
export default EnrolledCourse;
