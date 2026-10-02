import Client from '../models/Client.js';
import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import SessionNote from '../models/SessionNote.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { ENTITLEMENT_KEYS, requireEntitlement } from '../services/entitlementService.js';

const clientData = (body, { publicIntake = false, ipAddress } = {}) => {
  const data = {};
  const allowed = ['firstName', 'lastName', 'email', 'phone', 'status', 'tags'];
  allowed.forEach((key) => { if (Object.hasOwn(body, key)) data[key] = body[key]; });
  if (body.demographics) data.demographics = body.demographics;
  if (body.intake) data.intake = { ...body.intake, submittedAt: new Date() };
  if (publicIntake) {
    if (body.consentAccepted !== true) throw new AppError('Consent is required before submitting intake.', 422);
    data.consent = { isAccepted: true, acceptedAt: new Date(), consentVersion: body.consentVersion || 'v1.0', ipAddress };
  } else if (body.consent) data.consent = body.consent;
  return data;
};

export const listClients = asyncHandler(async (req, res) => {
  const { search = '', status, tag, page = 1, limit = 20 } = req.query;
  const query = { therapist: req.therapist._id };
  if (status) query.status = status;
  if (tag) query.tags = tag;
  if (search) {
    const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ firstName: expression }, { lastName: expression }, { email: expression }, { tags: expression }];
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [clients, total] = await Promise.all([
    Client.find(query).sort({ lastSessionDate: -1, createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
    Client.countDocuments(query)
  ]);
  res.json({ clients, pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } });
});

export const createClient = asyncHandler(async (req, res) => {
  const data = clientData(req.body);
  if (!data.firstName || !data.lastName || !data.email) throw new AppError('First name, last name, and email are required.', 422);
  if (data.status === 'active') await requireEntitlement(req.therapist._id, ENTITLEMENT_KEYS.ACTIVE_CLIENTS);
  const client = await Client.create({ therapist: req.therapist._id, ...data });
  res.status(201).json({ client });
});

export const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.clientId, therapist: req.therapist._id });
  if (!client) throw new AppError('Client not found.', 404);
  const [sessions, payments, notes] = await Promise.all([
    Session.find({ therapist: req.therapist._id, client: client._id }).sort({ startsAt: -1 }),
    Payment.find({ therapist: req.therapist._id, client: client._id })
      .select('description amount currency status type paidAt invoiceNumber createdAt session')
      .sort({ paidAt: -1, createdAt: -1 }),
    // This is a therapist-only aggregate. The client portal remains hard-filtered to shared notes.
    SessionNote.find({ therapist: req.therapist._id, client: client._id })
      .select('title type format session createdAt updatedAt sharedAt')
      .populate('session', 'startsAt')
      .sort({ createdAt: -1 })
  ]);
  res.json({ client, sessions, payments, notes });
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.clientId, therapist: req.therapist._id });
  if (!client) throw new AppError('Client not found.', 404);
  const data = clientData(req.body);
  if (data.status === 'active' && client.status !== 'active') await requireEntitlement(req.therapist._id, ENTITLEMENT_KEYS.ACTIVE_CLIENTS);
  Object.assign(client, data);
  await client.save();
  res.json({ client });
});

export const submitPublicIntake = asyncHandler(async (req, res) => {
  const therapist = req.publicTherapist;
  const data = clientData(req.body, { publicIntake: true, ipAddress: req.ip });
  if (!data.firstName || !data.lastName || !data.email) throw new AppError('First name, last name, and email are required.', 422);
  const client = await Client.findOneAndUpdate(
    { therapist: therapist._id, email: data.email.toLowerCase() },
    { $set: data, $setOnInsert: { therapist: therapist._id, status: 'lead' } },
    { new: true, upsert: true, runValidators: true }
  );
  const { createClientPortalToken } = await import('../utils/tokens.js');
  res.status(201).json({
    message: 'Your intake and consent have been recorded.',
    client: { id: client._id, firstName: client.firstName },
    portalAccessToken: createClientPortalToken(client)
  });
});

export const createClientPortalLink = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.clientId, therapist: req.therapist._id });
  if (!client) throw new AppError('Client not found.', 404);
  const { createClientPortalToken } = await import('../utils/tokens.js');
  res.json({ portalAccessToken: createClientPortalToken(client), expiresIn: '30d' });
});
