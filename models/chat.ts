import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const groupSchema = new Schema({
    name: { type: String, required: true },
    projectManager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now },
});

export const Group = models?.Group || model('Group', groupSchema);

const userGroupSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true }, 
    lastReadMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    joined_at: { type: Date, default: Date.now }, 
});

export const UserGroup = models?.UserGroup || model('UserGroup', userGroupSchema);

const messageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    content: { type: String, required: true },
    sent_at: { type: Date, default: Date.now },
});

export const Message = models?.Message || model('Message', messageSchema);

