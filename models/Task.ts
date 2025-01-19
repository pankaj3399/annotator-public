import mongoose from 'mongoose';
import { boolean } from 'zod';

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  content: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  annotator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, 
  ai: { type: mongoose.Schema.Types.ObjectId, ref: 'AImodel', required: false },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'reassigned'], default: 'pending' },
  submitted: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 },
  assignedAt:{type:Date,default:Date.now()},
  feedback: { type: String, default: '' },
  timer: { type: Number, default: 0 },
  type:{type:String,enum:['test','training','core'],default:'test'},
  isGroundTruth:{type:Boolean,default:false},
  template:{type:mongoose.Schema.Types.ObjectId,ref:'Template',required:true}
});

const Task = mongoose.models?.Task || mongoose.model('Task', taskSchema);
export default Task;