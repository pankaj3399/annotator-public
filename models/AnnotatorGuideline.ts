import { Schema, model, models, CallbackError } from 'mongoose';

// Define the message schema for annotator chats
const annotatorMessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isAiMessage: { type: Boolean, default: false },
  aiProvider: { type: String },
  aiModel: { type: String }
}, { timestamps: true });

// Define the AnnotatorGuideline schema
const annotatorGuidelineSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  annotator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentGuideline: {
    type: Schema.Types.ObjectId,
    ref: 'Guideline',
    required: true
  },
  messages: [annotatorMessageSchema],

  // Optional: Store last accessed time for analytics
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// === INDEXES FOR PERFORMANCE ===
// Compound index for finding annotator's guideline for a specific project
annotatorGuidelineSchema.index({ project: 1, annotator: 1 }, { unique: true });

// Index for populating parent guideline
annotatorGuidelineSchema.index({ parentGuideline: 1 });

// Index for finding all annotator guidelines for a project (if needed for admin)
annotatorGuidelineSchema.index({ project: 1 });

// Index for message queries
annotatorGuidelineSchema.index({ 'messages.timestamp': -1 });
annotatorGuidelineSchema.index({ 'messages.sender': 1 });

// Pre-save hook to update lastAccessedAt
annotatorGuidelineSchema.pre('save', function (next) {
  if (this.isModified('messages')) {
    this.lastAccessedAt = new Date();
  }
  next();
});

// Pre-remove hook for cleanup
annotatorGuidelineSchema.pre('deleteOne', async function (next) {
  try {
    // Optional: Add cleanup logic here if needed
    console.log('Deleting annotator guideline:', this.getFilter());
    next();
  } catch (error) {
    console.error('Error deleting annotator guideline:', error);
    next(error as CallbackError);
  }
});

// Static method to find or create annotator guideline
annotatorGuidelineSchema.statics.findOrCreate = async function (projectId: string, annotatorId: string, parentGuidelineId: string) {
  let annotatorGuideline = await this.findOne({
    project: projectId,
    annotator: annotatorId
  });

  if (!annotatorGuideline) {
    annotatorGuideline = new this({
      project: projectId,
      annotator: annotatorId,
      parentGuideline: parentGuidelineId,
      messages: []
    });
    await annotatorGuideline.save();
  }

  return annotatorGuideline;
};

export const AnnotatorGuideline = models?.AnnotatorGuideline || model('AnnotatorGuideline', annotatorGuidelineSchema);