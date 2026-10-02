import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  senderType: { type: String, enum: ['therapist', 'client'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String, trim: true, required: true, minlength: 1, maxlength: 4000 },
  readAt: Date
}, { timestamps: true });

chatMessageSchema.index({ therapist: 1, client: 1, createdAt: -1 });
chatMessageSchema.index({ client: 1, senderType: 1, readAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
