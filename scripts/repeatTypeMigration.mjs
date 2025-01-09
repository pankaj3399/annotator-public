import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

// TaskRepeat Schema definition in-house (updated schema)
const taskRepeatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  content: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  annotator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  ai: { type: mongoose.Schema.Types.ObjectId, ref: 'AImodel', required: false },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'reassigned'], default: 'pending' },
  type: { type: String, enum: ['test', 'training', 'core'], default: 'test' },  // type added here
  submitted: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  timer: { type: Number, default: 0 },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true }
});

const TaskRepeat = mongoose.models?.TaskRepeat || mongoose.model('TaskRepeat', taskRepeatSchema);

// Project Schema definition in-house
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  templates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  earnings_per_task: { 
    type: Number, 
    default: 0,
    min: 0,
    validate: {
      validator: function(value) {
        return value >= 0 && /^\d+(\.\d{1,2})?$/.test(value.toString());
      },
      message: 'Earnings per task must be a positive number with at most 2 decimal places'
    }
  }
});

const Project = mongoose.models?.Project || mongoose.model('Project', projectSchema);

async function migrate() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully');

    const tasksToUpdate = await TaskRepeat.find({ type: { $exists: false } });
    console.log(`Found ${tasksToUpdate.length} tasks with no type field`);

    for (const task of tasksToUpdate) {
      task.type = 'test'; // Assign 'test' if type is not present
      await task.save();
      console.log(`Updated task with ID: ${task._id} to type: 'test'`);
    }

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
