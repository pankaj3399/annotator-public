import mongoose from 'mongoose';

const reworkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
//   content: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  annotator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
//   status: { type: String, enum: ['pending', 'accepted', 'rejected', 'reassigned'], default: 'pending' },
//   submitted: { type: Boolean, default: false },
//   timeTaken: { type: Number, default: 0 },
  feedback: { type: String, default: '' }
});

const Rework = mongoose.models?.Rework || mongoose.model('Rework', reworkSchema);
export default Rework;
