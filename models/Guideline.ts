import { Schema, model, models, CallbackError } from 'mongoose';

// Define the GuidelineMessage schema
const guidelineMessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isAiMessage: { type: Boolean, default: false },
  aiProvider: { type: String },
  aiModel: { type: String },
  attachments: [{
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: Number },
    fileUrl: { type: String, required: true },
    s3Path: { type: String, required: true }
  }]
}, { timestamps: true });

const guidelineSchema = new Schema({
  project: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true,
    unique: true // Ensures only one guideline per project
  },
  description: { 
    type: String, 
    default: '' 
  },
  messages: [guidelineMessageSchema],
  files: [{
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number },
    fileUrl: { type: String, required: true },
    s3Path: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  }]
}, { timestamps: true });

// Ensure a project can have only one guideline
guidelineSchema.index({ project: 1 }, { unique: true });

// Pre-remove hook to clean up associated data if needed
guidelineSchema.pre('deleteOne', async function(next) {
  const guidelineId = this.getFilter()._id;
  
  try {
    // Optional: Additional cleanup logic can be added here
    next();
  } catch (error) {
    console.error('Error deleting guideline:', error);
    next(error as CallbackError);
  }
});

export const Guideline = models?.Guideline || model('Guideline', guidelineSchema);