import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  title: { type: String, trim: true, required: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 600, default: '' },
  sessionCount: { type: Number, required: true, enum: [3, 6, 12] },
  price: { type: Number, required: true, min: 0 }, // INR, configured by therapist
  expiryDays: { type: Number, required: true, min: 1, max: 730, default: 180 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true } });

packageSchema.index({ therapist: 1, isActive: 1 });
packageSchema.virtual('perSessionRate').get(function perSessionRate() {
  return this.sessionCount ? Number((this.price / this.sessionCount).toFixed(2)) : 0;
});

export default mongoose.model('Package', packageSchema);
