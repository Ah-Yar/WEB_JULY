import mongoose from 'mongoose';

// Each scheduled session claims 15-minute slot locks. The unique index is an API-level
// concurrency guard: overlapping booking requests cannot both succeed.
const bookingSlotSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  slotStart: { type: Date, required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true }
}, { timestamps: true });

bookingSlotSchema.index({ therapist: 1, slotStart: 1 }, { unique: true });

export default mongoose.model('BookingSlot', bookingSlotSchema);
