import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  durationMinutes: { type: Number, min: 15, max: 240, required: true },
  bufferMinutes: { type: Number, min: 0, max: 120, default: 0 },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  bookingSource: { type: String, enum: ['public', 'therapist'], default: 'public' },
  clientTimezone: { type: String, default: 'Asia/Kolkata' },
  serviceTitle: { type: String, trim: true, maxlength: 100, default: '' },
  amount: { type: Number, min: 0, default: 0 }, // paise; price at booking time
  currency: { type: String, default: 'INR' },
  paymentStatus: { type: String, enum: ['not_required', 'pending', 'authorized', 'paid', 'failed', 'refunded', 'package'], default: 'not_required' },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  clientPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientPackage' }
}, { timestamps: true });

sessionSchema.index({ therapist: 1, startsAt: 1 }, { unique: true });
sessionSchema.index({ therapist: 1, startsAt: 1, endsAt: 1, status: 1 });

export default mongoose.model('Session', sessionSchema);
