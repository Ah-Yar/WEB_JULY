import jwt from 'jsonwebtoken';
import Client from '../models/Client.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protectClientPortal = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new AppError('A client portal access link is required.', 401);
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'client_portal') throw new AppError('Invalid client portal access token.', 403);
    const client = await Client.findOne({ _id: payload.sub, therapist: payload.therapistId });
    if (!client) throw new AppError('This client portal link is no longer available.', 401);
    req.portalClient = client;
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('This client portal link is invalid or has expired.', 401);
  }
});
