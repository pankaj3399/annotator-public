// Task.ts
import mongoose from 'mongoose';

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
  assignedAt: { type: Date, default: Date.now() },
  feedback: { type: String, default: '' },
  timer: { type: Number, default: 0 },
  type: { type: String, enum: ['test', 'training', 'core'], default: 'test' },
  isGroundTruth: { type: Boolean, default: false },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// === EXISTING INDEXES (kept for backward compatibility) ===
taskSchema.index({ annotator: 1, project: 1 });
taskSchema.index({ annotator: 1, type: 1 });
taskSchema.index({ annotator: 1, updatedAt: -1 });
taskSchema.index({ annotator: 1, submitted: 1, updatedAt: -1 });
taskSchema.index({ reviewer: 1, submitted: -1, status: 1, created_at: -1 });
taskSchema.index({ project: 1, type: 1 });

// === NEW INDEXES FOR DASHBOARD QUERIES ===
// Single field indexes for common queries
taskSchema.index({ status: 1 });
taskSchema.index({ submitted: 1 });
taskSchema.index({ timeTaken: 1 });

// Compound indexes for aggregation queries
taskSchema.index({ project_Manager: 1, timeTaken: 1 });
taskSchema.index({ project: 1, project_Manager: 1, timeTaken: 1 });
taskSchema.index({ project_Manager: 1, project: 1, timeTaken: 1 });
taskSchema.index({ project_Manager: 1, status: 1 });
taskSchema.index({ project_Manager: 1, submitted: 1 });

const Task = mongoose.models?.Task || mongoose.model('Task', taskSchema);
export default Task;