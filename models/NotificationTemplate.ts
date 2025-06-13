import { Schema, model, models } from 'mongoose';

const notificationTemplateSchema = new Schema({
  triggerName: { type: String, required: true },
  triggerTitle: { type: String, required: true, default: 'Custom Title' },
  triggerBody: { type: String, required: true },
  active: { type: Boolean, default: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
}, { timestamps: true });

// Essential indexes for NotificationTemplate
notificationTemplateSchema.index({ project: 1 });
notificationTemplateSchema.index({ active: 1 });
notificationTemplateSchema.index({ project: 1, active: 1 });
notificationTemplateSchema.index({ triggerName: 1 });
notificationTemplateSchema.index({ project: 1, triggerName: 1 });
notificationTemplateSchema.index({ createdAt: -1 });
notificationTemplateSchema.index({ updatedAt: -1 });

const NotificationTemplate = models?.NotificationTemplate || model('NotificationTemplate', notificationTemplateSchema);

export default NotificationTemplate;