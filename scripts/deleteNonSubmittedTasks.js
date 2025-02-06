import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// Load environment variables from .env.local
// dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config();

// Ensure MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

// Task Schema definition
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
});

const Task = mongoose.models?.Task || mongoose.model('Task', taskSchema);

async function migrate() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully');

    const currentTime = new Date();
    
    // Find and delete tasks where timeTaken is 0 and created_at is before current time
    const result = await Task.deleteMany({
      timeTaken: 0,
      created_at: { $lt: currentTime }
    });

    console.log(`Deleted ${result.deletedCount} tasks`);
    console.log('Migration completed successfully');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Handle uncaught promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the migration
migrate();