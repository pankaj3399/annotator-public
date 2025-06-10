import { Schema, model, models } from 'mongoose';

const labelSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,  // Ensuring the name is unique for each label
    trim: true,    // Trim whitespaces around the label name
  }
}, { timestamps: true });  // Mongoose will automatically handle createdAt and updatedAt

// === OPTIMIZED INDEXES FOR LABEL QUERIES ===
labelSchema.index({ name: 1 }); // Primary index for unique constraint and name searches
labelSchema.index({ createdAt: -1 }); // Sort labels by creation date (newest first)
labelSchema.index({ updatedAt: -1 }); // Sort labels by last updated date

// === TEXT INDEX FOR SEARCH ===
labelSchema.index({ name: 'text' }); // Text search on label names (for partial matching)

// === CASE-INSENSITIVE SEARCH INDEX ===
labelSchema.index({ name: 1 }, { 
  collation: { locale: 'en', strength: 2 } // Case-insensitive searches
});

const Label = models?.Label || model('Label', labelSchema);

export default Label;