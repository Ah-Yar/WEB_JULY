import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 80, required: true },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  durationMinutes: { type: Number, min: 15, max: 240, default: 50 },
  price: { type: Number, min: 0, default: 0 },
  isVisible: { type: Boolean, default: true }
}, { _id: true });

const therapistSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, minlength: 2, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, required: true, unique: true, match: /^\S+@\S+\.\S+$/ },
  password_hash: { type: String, required: true, select: false },
  slug: { type: String, trim: true, lowercase: true, required: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  bio: { type: String, trim: true, maxlength: 2000, default: '' },
  headline: { type: String, trim: true, maxlength: 160, default: '' },
  specializations: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  services: { type: [serviceSchema], default: [] },
  profilePhotoUrl: { type: String, trim: true, default: '' },
  practiceDetails: {
    legalName: { type: String, trim: true, maxlength: 160, default: '' },
    address: { type: String, trim: true, maxlength: 500, default: '' },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 30, default: '' }
  },
  timezone: { type: String, trim: true, default: 'Asia/Kolkata' },
  // Tier identity only. Permissions and caps are resolved exclusively by EntitlementService.
  subscription: {
    tierKey: { type: String, trim: true, lowercase: true, default: 'starter' },
    status: { type: String, enum: ['active', 'trial', 'paused'], default: 'active' },
    changedAt: { type: Date, default: Date.now }
  },
  isProfilePublished: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true } });

export default mongoose.model('Therapist', therapistSchema);
