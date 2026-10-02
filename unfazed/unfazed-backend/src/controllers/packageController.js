import Client from '../models/Client.js';
import ClientPackage from '../models/ClientPackage.js';
import Package from '../models/Package.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { startCheckout } from '../services/paymentService.js';
import { createClientPortalToken } from '../utils/tokens.js';

const publicPackage = (item) => ({
  id: item._id,
  title: item.title,
  description: item.description,
  sessionCount: item.sessionCount,
  price: item.price,
  perSessionRate: Number((item.price / item.sessionCount).toFixed(2)),
  expiryDays: item.expiryDays
});

function packageData(body) {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    sessionCount: Number(body.sessionCount),
    price: Number(body.price),
    expiryDays: Number(body.expiryDays),
    isActive: body.isActive !== false
  };
}

async function upsertPublicClient(therapistId, input, ipAddress) {
  const { firstName, lastName, email, phone = '', consentAccepted, consentVersion = 'v1.0' } = input;
  if (!firstName || !lastName || !email) throw new AppError('Client name and email are required to buy a package.', 422);
  const normalizedEmail = String(email).trim().toLowerCase();
  let client = await Client.findOne({ therapist: therapistId, email: normalizedEmail });
  if (client) {
    if (!client.consent?.isAccepted) {
      if (consentAccepted !== true) throw new AppError('Consent is required before purchasing a package.', 422);
      client.consent = { isAccepted: true, acceptedAt: new Date(), consentVersion, ipAddress };
      await client.save();
    }
    return client;
  }
  if (consentAccepted !== true) throw new AppError('Consent is required before purchasing a package.', 422);
  return Client.create({
    therapist: therapistId, firstName, lastName, email: normalizedEmail, phone, status: 'lead',
    consent: { isAccepted: true, acceptedAt: new Date(), consentVersion, ipAddress }
  });
}

export const listPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ therapist: req.therapist._id }).sort({ isActive: -1, price: 1 });
  res.json({ packages });
});

export const createPackage = asyncHandler(async (req, res) => {
  const data = packageData(req.body);
  if (!data.title || !Number.isInteger(data.sessionCount) || ![3, 6, 12].includes(data.sessionCount) || !Number.isFinite(data.price) || data.price <= 0 || !Number.isInteger(data.expiryDays) || data.expiryDays < 1) {
    throw new AppError('Add a title, a 3, 6, or 12-session package, a price, and an expiry period.', 422);
  }
  const item = await Package.create({ therapist: req.therapist._id, ...data });
  res.status(201).json({ package: item });
});

export const updatePackage = asyncHandler(async (req, res) => {
  const item = await Package.findOne({ _id: req.params.packageId, therapist: req.therapist._id });
  if (!item) throw new AppError('Package not found.', 404);
  const data = packageData({ ...item.toObject(), ...req.body });
  if (!data.title || !Number.isInteger(data.sessionCount) || ![3, 6, 12].includes(data.sessionCount) || !Number.isFinite(data.price) || data.price <= 0 || !Number.isInteger(data.expiryDays) || data.expiryDays < 1) {
    throw new AppError('Package details are invalid.', 422);
  }
  Object.assign(item, data);
  await item.save();
  res.json({ package: item });
});

export const listPublicPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ therapist: req.publicTherapist._id, isActive: true }).sort({ price: 1 });
  res.json({ packages: packages.map(publicPackage) });
});

export const purchasePublicPackage = asyncHandler(async (req, res) => {
  const item = await Package.findOne({ _id: req.params.packageId, therapist: req.publicTherapist._id, isActive: true });
  if (!item) throw new AppError('This package is not available.', 404);
  const client = await upsertPublicClient(req.publicTherapist._id, req.body.client || {}, req.ip);
  const clientPackage = await ClientPackage.create({
    therapist: req.publicTherapist._id,
    client: client._id,
    package: item._id,
    packageTitle: item.title,
    purchasedSessionCount: item.sessionCount,
    remainingSessionCount: item.sessionCount,
    pricePaid: Math.round(item.price * 100),
    expiresAt: new Date(Date.now() + item.expiryDays * 24 * 60 * 60 * 1000),
    status: 'pending'
  });
  const { checkout } = await startCheckout({
    therapist: req.publicTherapist,
    client,
    clientPackage,
    amount: clientPackage.pricePaid,
    type: 'package',
    description: `${item.title} · ${item.sessionCount} sessions`
  });
  res.status(201).json({
    message: 'Package reserved. Complete payment to activate it.',
    clientPackage: { id: clientPackage._id, title: clientPackage.packageTitle, sessionCount: clientPackage.purchasedSessionCount, expiresAt: clientPackage.expiresAt },
    checkout,
    portalAccessToken: createClientPortalToken(client)
  });
});
