import mongoose from 'mongoose';

const timeRangeSchema = new mongoose.Schema({
  start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }
}, { _id: false });

const weeklyDaySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 Sunday
  enabled: { type: Boolean, default: false },
  slots: { type: [timeRangeSchema], default: [] }
}, { _id: false });

const overrideSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  isBlocked: { type: Boolean, default: false },
  slots: { type: [timeRangeSchema], default: [] }
}, { _id: false });

const blockedSlotSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  reason: { type: String, trim: true, maxlength: 160, default: 'Unavailable' }
}, { _id: true });

const availabilitySchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, unique: true },
  weeklySchedule: { type: [weeklyDaySchema], default: [] },
  overrides: { type: [overrideSchema], default: [] },
  blockedSlots: { type: [blockedSlotSchema], default: [] },
  sessionDurations: { type: [Number], default: [50], validate: [(values) => values.every((v) => Number.isInteger(v) && v >= 15 && v <= 240), 'Invalid session duration.'] },
  bufferMinutes: { type: Number, min: 0, max: 120, default: 10 },
  slotIntervalMinutes: { type: Number, min: 5, max: 60, default: 15 }
}, { timestamps: true });

export default mongoose.model('Availability', availabilitySchema);
