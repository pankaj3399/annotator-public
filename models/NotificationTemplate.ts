import { Schema, model, models } from 'mongoose';

const notificationTemplateSchema = new Schema({
  triggerName: { type: String, required: true },
  triggerTitle:{type:String,required:true,default:'Custom Title'},
  triggerBody: { type: String, required: true },
  active: { type: Boolean, default: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
}, { timestamps: true });

const NotificationTemplate = models?.NotificationTemplate || model('NotificationTemplate', notificationTemplateSchema);

export default NotificationTemplate;