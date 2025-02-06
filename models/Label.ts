import { Schema, model, models } from 'mongoose';

const labelSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,  // Ensuring the name is unique for each label
    trim: true,    // Trim whitespaces around the label name
  }
}, { timestamps: true });  // Mongoose will automatically handle createdAt and updatedAt

const Label = models?.Label || model('Label', labelSchema);

export default Label;
