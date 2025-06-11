import mongoose, { Schema, model, models } from "mongoose";

const commentSchema = new Schema({
  content: { 
    type: String, 
    required: true 
  },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

const discussionSchema = new Schema({
  title: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  project: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  tags: { 
    type: [String], 
    default: [] 
  },
  visibility: { 
    type: String,
    enum: ['public', 'internal', 'private'],
    default: 'public'
  },
  likes: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  comments: [commentSchema],
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// === OPTIMIZED INDEXES BASED ON SERVER FILE USAGE ===
discussionSchema.index({ created_at: -1 }); // For .sort({ created_at: -1 }) queries
discussionSchema.index({ project: 1 }); // For filtering by project: filter.project = projectId
discussionSchema.index({ author: 1 }); // For author-based filtering in role-based access control
discussionSchema.index({ visibility: 1 }); // For visibility filtering in project manager queries

// Virtual to get comment count
discussionSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual to get like count
discussionSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Pre-save middleware to update the updated_at timestamp
discussionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Pre-find middleware to populate author and project
discussionSchema.pre(/^find/, function(next) {
  // Cast 'this' to any to avoid TypeScript errors with populate chaining
  (this as any).populate({
    path: 'author',
    select: 'name role'
  }).populate({
    path: 'project',
    select: 'name'
  });
  
  next();
});

// Make sure virtuals are included when converting to JSON
discussionSchema.set('toJSON', { virtuals: true });
discussionSchema.set('toObject', { virtuals: true });

export const Discussion = models?.Discussion || model('Discussion', discussionSchema);