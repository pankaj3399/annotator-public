import { Schema, model, models } from "mongoose";

const taskRepeatSchema = new Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  content: { type: String, required: true },
  project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  project_Manager: { type: Schema.Types.ObjectId, ref: "User", required: true },
  annotator: { type: Schema.Types.ObjectId, ref: "User", required: false },
  reviewer: { type: Schema.Types.ObjectId, ref: "User", required: false },
  ai: { type: Schema.Types.ObjectId, ref: "AImodel", required: false },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "reassigned"],
    default: "pending",
  },
  type:{type:String,enum:['test','training','core'],default:'test'},
  submitted: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 },
  feedback: { type: String, default: "" },
  timer: { type: Number, default: 0 },
  template:{type:Schema.Types.ObjectId,ref:'Template',required:true}});

export const TaskRepeat =
  models?.TaskRepeat || model("TaskRepeat", taskRepeatSchema);
