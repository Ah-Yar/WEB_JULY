import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
  clientPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientPackage', index: true },
  type: { type: String, enum: ['session', 'package'], required: true },
  description: { type: String, trim: true, required: true, maxlength: 200 },
  gateway: { type: String, enum: ['razorpay', 'demo'], default: 'razorpay' },
  razorpayOrderId: { type: String, trim: true, unique: true, sparse: true },
  gatewayTransactionId: { type: String, trim: true, unique: true, sparse: true },
  receiptNumber: { type: String, trim: true, required: true, unique: true },
  amount: { type: Number, required: true, min: 0 }, // paise
  platformFee: { type: Number, min: 0, default: 0 }, // paise
  netAmount: { type: Number, min: 0, default: 0 }, // paise
  currency: { type: String, default: 'INR', uppercase: true },
  status: { type: String, enum: ['initiated', 'authorized', 'captured', 'failed', 'refunded'], default: 'initiated', index: true },
  checkoutTokenHash: { type: String, required: true, select: false },
  invoiceNumber: { type: String, sparse: true, unique: true },
  invoiceFileName: { type: String },
  invoiceUrl: { type: String },
  paidAt: Date,
  gatewayPayload: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

paymentSchema.index({ therapist: 1, createdAt: -1 });
paymentSchema.index({ client: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
