import mongoose from 'mongoose';

const structuredDataSchema = new mongoose.Schema({
  subjective: { type: String, trim: true, maxlength: 15000, default: '' },
  objective: { type: String, trim: true, maxlength: 15000, default: '' },
  assessment: { type: String, trim: true, maxlength: 15000, default: '' },
  plan: { type: String, trim: true, maxlength: 15000, default: '' }
}, { _id: false });

const sessionNoteSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  type: { type: String, enum: ['private', 'shared'], required: true, default: 'private', index: true },
  format: { type: String, enum: ['freeform', 'soap', 'dap'], default: 'freeform' },
  title: { type: String, trim: true, maxlength: 160, default: '' },
  content: { type: String, trim: true, maxlength: 50000, default: '' }, // TipTap HTML for freeform notes
  structuredData: { type: structuredDataSchema, default: () => ({}) },
  sharedAt: Date
}, { timestamps: true });

sessionNoteSchema.index({ therapist: 1, client: 1, session: 1, type: 1, createdAt: -1 });

export default mongoose.model('SessionNote', sessionNoteSchema);
