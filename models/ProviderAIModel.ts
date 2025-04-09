// models/ProviderAIModel.js
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ProviderAIModelSchema = new Schema({
  // Reference to the user who created this model
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Display name for the model configuration
  name: {
    type: String,
    required: true
  },
  // The model identifier (e.g., 'gpt-4', 'claude-3-opus-latest')
  model: {
    type: String,
    required: true
  },
  // The provider identifier (e.g., 'openai', 'anthropic', 'gemini')
  provider: {
    type: String,
    required: true
  },
  // Encrypted API key for the provider
  apiKey: {
    type: String,
    required: true
  },
  // Optional system prompt to use with this model
  systemPrompt: {
    type: String,
    default: ''
  },
  // Track when this model was last used
  lastUsed: {
    type: Date,
    default: null
  },
  // Track when this model was last updated
  // Note: Removed isActive field as we're using full deletion
  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Last update timestamp
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index to ensure each user can have unique model configurations
ProviderAIModelSchema.index({ user: 1, name: 1 }, { unique: true });

// Update the timestamp on save
ProviderAIModelSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Export the model
export const ProviderAIModel = models?.ProviderAIModel || model('ProviderAIModel', ProviderAIModelSchema);

// Optional: Add a model method to update lastUsed
ProviderAIModelSchema.methods.markAsUsed = async function () {
  this.lastUsed = new Date();
  return this.save();
};

export default ProviderAIModel;