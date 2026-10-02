import jwt from 'jsonwebtoken';
import Therapist from '../models/Therapist.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw new AppError('Authentication is required.', 401);
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'therapist') throw new AppError('Invalid account role.', 403);
    const therapist = await Therapist.findById(payload.sub);
    if (!therapist) throw new AppError('This account no longer exists.', 401);
    req.therapist = therapist;
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Your session is invalid or has expired.', 401);
  }
});
