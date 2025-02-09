// models/JobPost.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IJobPost extends Document {
  title: string;
  content: string; // This will store the markdown content
  projectDuration: {
    startDate: Date;
    endDate: Date;
  };
  compensation: string;
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
}

const JobPostSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  projectDescription:{
    type:String,
    required:false,
    default:""
  },
  taskDescription:{
    type:String,
    required:false,
    default:""
  },
  skills:{
    type:String,
    required:false,
    default:""
  },
  content: {
    type: String,
    required: true,
  },
  projectDuration: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  location:{
    type:String,
    required:true
  },
  lat:{
    type:String,
    required:false
  },
  lng:{
    type:String,
    required:false
  },
  compensation: {
    type: String,
    required: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },
  image:{
    type:String,
    required:false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  label:{
    type:[String],
    required:false
  }
});

export default mongoose.models.JobPost ||
  mongoose.model<IJobPost>("JobPost", JobPostSchema);
