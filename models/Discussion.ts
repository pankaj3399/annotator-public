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

// === OPTIMIZED INDEXES FOR DISCUSSION QUERIES ===
discussionSchema.index({ project: 1, created_at: -1 }); // Existing: Project discussions sorted by date
discussionSchema.index({ author: 1 }); // Find discussions by author
discussionSchema.index({ visibility: 1 }); // Filter by visibility level
discussionSchema.index({ tags: 1 }); // Find discussions by tags
discussionSchema.index({ likes: 1 }); // Find discussions liked by user
discussionSchema.index({ created_at: -1 }); // Sort all discussions by date
discussionSchema.index({ updated_at: -1 }); // Sort by last updated

// === COMPOUND INDEXES FOR COMMON QUERY COMBINATIONS ===
discussionSchema.index({ project: 1, visibility: 1 }); // Project discussions by visibility
discussionSchema.index({ project: 1, author: 1 }); // Project discussions by author
discussionSchema.index({ project: 1, tags: 1 }); // Project discussions by tags
discussionSchema.index({ author: 1, created_at: -1 }); // Author's discussions sorted by date
discussionSchema.index({ visibility: 1, created_at: -1 }); // Discussions by visibility, sorted by date
discussionSchema.index({ tags: 1, created_at: -1 }); // Discussions by tags, sorted by date
discussionSchema.index({ project: 1, visibility: 1, created_at: -1 }); // Project discussions by visibility, sorted
discussionSchema.index({ project: 1, tags: 1, created_at: -1 }); // Project discussions by tags, sorted

// === TEXT INDEXES FOR SEARCH ===
discussionSchema.index({ title: 'text', content: 'text' }); // Text search on title and content

// === INDEXES FOR EMBEDDED COMMENTS ===
discussionSchema.index({ 'comments.author': 1 }); // Find discussions with comments by specific user
discussionSchema.index({ 'comments.created_at': -1 }); // Sort by comment dates

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