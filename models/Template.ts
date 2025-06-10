// Template.ts
import { Schema, model, models } from 'mongoose';

const templateSchema = new Schema({
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    content: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    timer: { type: Number, default: 0 },
    private: { type: Boolean, default: false },
    testTemplate: { type: Boolean, default: false },
    type: { type: String, enum: ['test', 'training', 'core'], default: 'test' },
    groundTruthTask: { type: Schema.Types.ObjectId, ref: 'Task', required: false },
});

// === OPTIMIZED INDEXES FOR TEMPLATE QUERIES ===
templateSchema.index({ project: 1 }); // Find templates by project
templateSchema.index({ type: 1 }); // Filter by template type
templateSchema.index({ private: 1 }); // Filter by private/public status
templateSchema.index({ testTemplate: 1 }); // Filter by test template flag
templateSchema.index({ groundTruthTask: 1 }); // Find templates by ground truth task
templateSchema.index({ created_at: -1 }); // Sort by creation date (newest first)

// === COMPOUND INDEXES FOR COMMON QUERY COMBINATIONS ===
templateSchema.index({ project: 1, type: 1 }); // Project templates by type
templateSchema.index({ project: 1, private: 1 }); // Project templates by privacy
templateSchema.index({ project: 1, created_at: -1 }); // Project templates sorted by date
templateSchema.index({ project: 1, testTemplate: 1 }); // Project templates by test flag
templateSchema.index({ type: 1, private: 1 }); // Templates by type and privacy
templateSchema.index({ project: 1, type: 1, private: 1 }); // Project templates by type and privacy
templateSchema.index({ project: 1, type: 1, created_at: -1 }); // Project templates by type, sorted by date

// === TEXT INDEX FOR NAME SEARCH ===
templateSchema.index({ name: 'text' }); // Text search on template names

export const Template = models?.Template || model('Template', templateSchema);