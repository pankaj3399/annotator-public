import mongoose from 'mongoose';

const reworkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  annotator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Added reviewer field
  feedback: { type: String, default: '' },
  reviewed_by: { type: String, enum: ['project_manager', 'reviewer'], required: true, default: 'project_manager' } // Added to track who created the rework record
});

const Rework = mongoose.models?.Rework || mongoose.model('Rework', reworkSchema);
export default Rework;