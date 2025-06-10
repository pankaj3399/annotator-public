import { Schema, model, models } from 'mongoose';

const labelSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,  // Ensuring the name is unique for each label
    trim: true,    // Trim whitespaces around the label name
  }
}, { timestamps: true });  // Mongoose will automatically handle createdAt and updatedAt

labelSchema.index({ name: 1 }); // Primary index for unique constraint and findOne({ name }) queries
labelSchema.index({ name: 1 }, { 
  collation: { locale: 'en', strength: 2 } // Case-insensitive searches for name queries
});

const Label = models?.Label || model('Label', labelSchema);

export default Label;