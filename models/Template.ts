import { Schema, model, models } from 'mongoose';

const templateSchema = new Schema({
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    content: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    timer: { type: Number, default: 0 },
    private: { type: Boolean, default: false },
    type:{type:String,enum:['test','training','core'],default:'test'},
    groundTruthTask:{type:Schema.Types.ObjectId,ref:'Task',required:false}
});

export const Template = models?.Template || model('Template', templateSchema);
