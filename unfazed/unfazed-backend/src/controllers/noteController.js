import Client from '../models/Client.js';
import Session from '../models/Session.js';
import SessionNote from '../models/SessionNote.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { ENTITLEMENT_KEYS, requireEntitlement } from '../services/entitlementService.js';

async function noteData(therapistId, body) {
  const type = body.type === 'shared' ? 'shared' : 'private';
  const format = ['freeform', 'soap', 'dap'].includes(body.format) ? body.format : 'freeform';
  const structuredData = body.structuredData || {};
  if (format !== 'freeform') await requireEntitlement(therapistId, ENTITLEMENT_KEYS.STRUCTURED_NOTE_TEMPLATES);
  const content = String(body.content || '');
  if (format === 'freeform' && !content.trim()) throw new AppError('Write a note before saving it.', 422);
  if (format !== 'freeform' && !Object.values(structuredData).some((value) => String(value || '').trim())) {
    throw new AppError('Add content to at least one template field before saving.', 422);
  }
  return { type, format, title: String(body.title || '').trim(), content, structuredData };
}

async function ownedSession(therapistId, clientId, sessionId) {
  const [client, session] = await Promise.all([
    Client.exists({ _id: clientId, therapist: therapistId }),
    Session.findOne({ _id: sessionId, therapist: therapistId, client: clientId })
  ]);
  if (!client || !session) throw new AppError('The selected client or session was not found in your practice.', 404);
  return session;
}

export const listTherapistNotes = asyncHandler(async (req, res) => {
  const query = { therapist: req.therapist._id };
  if (req.query.clientId) query.client = req.query.clientId;
  if (req.query.sessionId) query.session = req.query.sessionId;
  if (req.query.type && ['private', 'shared'].includes(req.query.type)) query.type = req.query.type;
  const notes = await SessionNote.find(query).populate('client', 'firstName lastName').populate('session', 'startsAt durationMinutes').sort({ createdAt: -1 }).limit(200);
  res.json({ notes });
});

export const createNote = asyncHandler(async (req, res) => {
  const { clientId, sessionId } = req.body;
  if (!clientId || !sessionId) throw new AppError('Select a client and session for this note.', 422);
  await ownedSession(req.therapist._id, clientId, sessionId);
  const data = await noteData(req.therapist._id, req.body);
  const note = await SessionNote.create({
    therapist: req.therapist._id, client: clientId, session: sessionId, ...data,
    ...(data.type === 'shared' ? { sharedAt: new Date() } : {})
  });
  res.status(201).json({ note });
});

export const getNote = asyncHandler(async (req, res) => {
  const note = await SessionNote.findOne({ _id: req.params.noteId, therapist: req.therapist._id });
  if (!note) throw new AppError('Note not found.', 404);
  res.json({ note });
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await SessionNote.findOne({ _id: req.params.noteId, therapist: req.therapist._id });
  if (!note) throw new AppError('Note not found.', 404);
  const data = await noteData(req.therapist._id, req.body);
  Object.assign(note, data);
  if (data.type === 'shared' && !note.sharedAt) note.sharedAt = new Date();
  if (data.type === 'private') note.sharedAt = undefined;
  await note.save();
  res.json({ note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const note = await SessionNote.findOneAndDelete({ _id: req.params.noteId, therapist: req.therapist._id });
  if (!note) throw new AppError('Note not found.', 404);
  res.status(204).send();
});

// This is deliberately a separate, client-authenticated query. Private notes are not fetched,
// transformed, or hidden client-side; MongoDB is instructed to return shared notes only.
export const listClientPortalNotes = asyncHandler(async (req, res) => {
  const notes = await SessionNote.find({ client: req.portalClient._id, therapist: req.portalClient.therapist, type: 'shared' })
    .select('session title content structuredData format sharedAt createdAt updatedAt')
    .populate('session', 'startsAt endsAt durationMinutes')
    .sort({ sharedAt: -1, createdAt: -1 });
  res.json({
    client: { id: req.portalClient._id, firstName: req.portalClient.firstName, therapist: req.portalClient.therapist },
    notes
  });
});
