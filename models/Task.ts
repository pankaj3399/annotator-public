import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  content: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  annotator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  ai:{type: mongoose.Schema.Types.ObjectId, ref: 'AImodel', required: false },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'reassigned'], default: 'pending' },
  submitted: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  timer: { type: Number, default: 0 },
});

const Task = mongoose.models?.Task || mongoose.model('Task', taskSchema);
export default Task;
