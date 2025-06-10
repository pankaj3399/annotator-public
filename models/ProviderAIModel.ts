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

// === OPTIMIZED INDEXES FOR PROVIDER AI MODEL QUERIES ===
ProviderAIModelSchema.index({ user: 1, name: 1 }, { unique: true }); // Existing: Unique user model configs
ProviderAIModelSchema.index({ user: 1 }); // Find all models for a user
ProviderAIModelSchema.index({ provider: 1 }); // Filter by provider (openai, anthropic, etc.)
ProviderAIModelSchema.index({ model: 1 }); // Filter by model type (gpt-4, claude-3, etc.)
ProviderAIModelSchema.index({ lastUsed: -1 }); // Sort by most recently used
ProviderAIModelSchema.index({ createdAt: -1 }); // Sort by creation date
ProviderAIModelSchema.index({ updatedAt: -1 }); // Sort by last updated

// === COMPOUND INDEXES FOR COMMON QUERY COMBINATIONS ===
ProviderAIModelSchema.index({ user: 1, provider: 1 }); // User's models by provider
ProviderAIModelSchema.index({ user: 1, model: 1 }); // User's models by model type
ProviderAIModelSchema.index({ user: 1, lastUsed: -1 }); // User's models sorted by usage
ProviderAIModelSchema.index({ user: 1, createdAt: -1 }); // User's models sorted by creation date
ProviderAIModelSchema.index({ provider: 1, model: 1 }); // Models by provider and type
ProviderAIModelSchema.index({ user: 1, provider: 1, lastUsed: -1 }); // User's provider models by usage
ProviderAIModelSchema.index({ user: 1, provider: 1, createdAt: -1 }); // User's provider models by date

// === SPARSE INDEXES FOR OPTIONAL FIELDS ===
ProviderAIModelSchema.index({ lastUsed: -1 }, { sparse: true }); // Only index models that have been used

// === TEXT INDEX FOR SEARCH ===
ProviderAIModelSchema.index({ name: 'text', systemPrompt: 'text' }); // Search by name and system prompt

// Update the timestamp on save
ProviderAIModelSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Optional: Add a model method to update lastUsed
ProviderAIModelSchema.methods.markAsUsed = async function () {
  this.lastUsed = new Date();
  return this.save();
};

// Export the model
export const ProviderAIModel = models?.ProviderAIModel || model('ProviderAIModel', ProviderAIModelSchema);

export default ProviderAIModel;