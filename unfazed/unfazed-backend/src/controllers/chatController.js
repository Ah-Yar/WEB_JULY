import ChatMessage from '../models/ChatMessage.js';
import Client from '../models/Client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';

const getLimit = (value) => Math.min(Math.max(Number(value) || 80, 1), 200);

export const listTherapistMessages = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.clientId, therapist: req.therapist._id });
  if (!client) throw new AppError('Client not found in your practice.', 404);
  const query = { therapist: req.therapist._id, client: client._id };
  const messages = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(getLimit(req.query.limit));
  await ChatMessage.updateMany({ ...query, senderType: 'client', readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.json({ client: { id: client._id, firstName: client.firstName, lastName: client.lastName }, messages: messages.reverse() });
});

export const listClientPortalMessages = asyncHandler(async (req, res) => {
  const query = { therapist: req.portalClient.therapist, client: req.portalClient._id };
  const messages = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(getLimit(req.query.limit));
  await ChatMessage.updateMany({ ...query, senderType: 'therapist', readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.json({ messages: messages.reverse() });
});
