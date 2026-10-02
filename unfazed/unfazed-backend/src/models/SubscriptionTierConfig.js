import mongoose from 'mongoose';

/**
 * Subscription plans are data, rather than scattered conditionals. Values here intentionally
 * model feature access only; price and billing are owned by a future billing provider.
 */
const subscriptionTierConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, lowercase: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 400, default: '' },
  caps: {
    activeClients: { type: Number, required: true, min: 1 },
    analyticsHistoryMonths: { type: Number, required: true, min: 1, max: 60 }
  },
  featureFlags: {
    structuredNoteTemplates: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

subscriptionTierConfigSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model('SubscriptionTierConfig', subscriptionTierConfigSchema);
