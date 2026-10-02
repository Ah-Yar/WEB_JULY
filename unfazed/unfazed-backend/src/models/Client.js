import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 100 },
  relationship: { type: String, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, maxlength: 30 }
}, { _id: false });

const clientSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  firstName: { type: String, trim: true, required: true, maxlength: 80 },
  lastName: { type: String, trim: true, required: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, required: true, match: /^\S+@\S+\.\S+$/ },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  status: { type: String, enum: ['lead', 'active', 'inactive'], default: 'lead' },
  tags: { type: [String], default: [] },
  demographics: {
    dateOfBirth: Date,
    pronouns: { type: String, trim: true, maxlength: 60 },
    gender: { type: String, trim: true, maxlength: 60 },
    address: { type: String, trim: true, maxlength: 300 },
    emergencyContact: emergencyContactSchema
  },
  intake: {
    presentingConcern: { type: String, trim: true, maxlength: 6000 },
    therapyHistory: { type: String, trim: true, maxlength: 6000 },
    medicalHistory: { type: String, trim: true, maxlength: 6000 },
    goals: { type: String, trim: true, maxlength: 6000 },
    submittedAt: Date
  },
  consent: {
    isAccepted: { type: Boolean, default: false },
    acceptedAt: Date,
    consentVersion: { type: String, trim: true, default: 'v1.0' },
    ipAddress: { type: String, trim: true, maxlength: 100 }
  },
  lastSessionDate: Date
}, { timestamps: true, toJSON: { virtuals: true } });

clientSchema.index({ therapist: 1, email: 1 }, { unique: true });
clientSchema.index({ therapist: 1, status: 1, lastSessionDate: -1 });
clientSchema.virtual('fullName').get(function fullName() { return `${this.firstName} ${this.lastName}`.trim(); });

export default mongoose.model('Client', clientSchema);
