import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const groupSchema = new Schema({
    name: { type: String, required: true },
    projectManager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now },
});

// Group indexes
groupSchema.index({ projectManager: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ created_at: -1 });

export const Group = models?.Group || model('Group', groupSchema);

const userGroupSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true }, 
    lastReadMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    joined_at: { type: Date, default: Date.now }, 
});

// UserGroup indexes - compound index for main query patterns
userGroupSchema.index({ user: 1, group: 1 }, { unique: true });
userGroupSchema.index({ user: 1 });
userGroupSchema.index({ group: 1 });
userGroupSchema.index({ joined_at: -1 });

export const UserGroup = models?.UserGroup || model('UserGroup', userGroupSchema);

const messageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    content: { type: String, required: true },
    sent_at: { type: Date, default: Date.now },
});

// Message indexes - compound index for group-based queries with time ordering
messageSchema.index({ group: 1, sent_at: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ group: 1 });
messageSchema.index({ sent_at: -1 });

export const Message = models?.Message || model('Message', messageSchema);