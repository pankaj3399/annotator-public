import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const AImodelSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectid: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    model: { type: String, required: true },
    provider: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    apiKey: { type: String, required: true },
    systemPrompt: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

export const AImodel = models?.AImodel || model('AImodel', AImodelSchema);

const AIJobSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectid: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    taskid: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    modelid: { type: Schema.Types.ObjectId, ref: 'AImodel', required: true },
    completed: { type: Boolean, default: false },
});

export const AIJob = models?.AIJob || model('AIJob', AIJobSchema);