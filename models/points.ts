import mongoose from "mongoose";

const AnnotatorPoints = new mongoose.Schema({
  annotator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true }, // Add project reference
  totalPoints: { type: Number, default: 0 },
  history: [
    {
      task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
      template: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: true },
      pointsEarned: { type: Number, default: 0 },
      submittedAnswer: { type: String },
      groundTruthAnswer: { type: String },
      comparisonResult: { type: Boolean },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

const AnnotatorHistory =
  mongoose.models?.AnnotatorPoints || mongoose.model("AnnotatorPoints", AnnotatorPoints);

export default AnnotatorHistory;
