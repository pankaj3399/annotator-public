import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();


// Ensure MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

// Task Schema definition in-house
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

    const tasksToUpdate = await Task.find({ template: { $exists: false } });
    console.log(`Found ${tasksToUpdate.length} tasks to update`);

    for (const task of tasksToUpdate) {
      const project = await Project.findById(task.project);
      if (project?.templates?.length > 0) {
        task.template = project.templates[0]; // Assign the first template from the project
        await task.save();
        console.log(`Updated task with ID: ${task._id}`);
      }
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
