import mongoose from 'mongoose';

const redemptionSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  redeemedAt: { type: Date, default: Date.now }
}, { _id: false });

const clientPackageSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  packageTitle: { type: String, required: true },
  purchasedSessionCount: { type: Number, required: true, min: 1 },
  remainingSessionCount: { type: Number, required: true, min: 0 },
  pricePaid: { type: Number, required: true, min: 0 }, // paise
  purchasedAt: Date,
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'active', 'exhausted', 'expired', 'cancelled'], default: 'pending' },
  redemptions: { type: [redemptionSchema], default: [] }
}, { timestamps: true });

clientPackageSchema.index({ therapist: 1, client: 1, status: 1, expiresAt: 1 });

export default mongoose.model('ClientPackage', clientPackageSchema);
