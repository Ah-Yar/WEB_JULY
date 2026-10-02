import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
  recipientType: { type: String, enum: ['therapist', 'client'], required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  channel: { type: String, enum: ['in_app', 'email', 'whatsapp_stub'], required: true },
  eventKey: { type: String, required: true, unique: true },
  type: { type: String, enum: ['booking_confirmed', 'payment_captured', 'session_reminder', 'post_session_follow_up', 'new_message'], required: true },
  title: { type: String, trim: true, required: true, maxlength: 160 },
  body: { type: String, trim: true, required: true, maxlength: 1000 },
  status: { type: String, enum: ['queued', 'sent', 'stubbed', 'failed'], default: 'queued' },
  readAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
