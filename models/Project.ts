import { Schema, model, models, CallbackError } from 'mongoose';
import Task from './Task';
import { Template } from './Template';
import { TaskRepeat } from './TaskRepeat';

const projectSchema = new Schema({
  name: { type: String, required: true },
  project_Manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  // updated_at: { type: Date, default: Date.now },
  templates: [{ type: Schema.Types.ObjectId, ref: 'Template' }],
  earnings_per_task: { 
    type: Number, 
    default: 0,
    min: 0,
    validate: {
      validator: function(value: number) {
        // Ensures value is not negative and has at most 2 decimal places
        return value >= 0 && /^\d+(\.\d{1,2})?$/.test(value.toString());
      },
      message: 'Earnings per task must be a positive number with at most 2 decimal places'
    }
  }
});

projectSchema.pre('findOneAndDelete', async function (next) {
  const projectId = this.getFilter()._id
  if (!projectId) {
    return next(new Error('Project ID not found in filter.'));
  }

  try {
    // Delete all associated templates
    await Template.deleteMany({ project: projectId });
    
    // Optionally delete associated tasks if you have a Task model
    await Task.deleteMany({ project: projectId });


     await TaskRepeat.deleteMany({ project: projectId });
    
    next();
  } catch (error) {
    console.error('Error deleting project:', error);
    next(error as CallbackError); // Pass the error to the next middleware
  }
});

export const Project = models?.Project || model('Project', projectSchema);