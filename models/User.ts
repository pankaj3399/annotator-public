import { Schema, model, models } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  domain: [{ type: String }],
  location: { type: String },
  phone: { type: String },
  lang: [{ type: String }],
  role: { type: String, enum: ['project manager', 'annotator'], required: true },
  lastLogin: { type: Date, default: Date.now },
  // status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export const User = models?.User || model('User', userSchema);
