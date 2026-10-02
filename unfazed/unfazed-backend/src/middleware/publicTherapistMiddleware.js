import Therapist from '../models/Therapist.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const loadPublicTherapist = asyncHandler(async (req, _res, next) => {
  const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase(), isProfilePublished: true });
  if (!therapist) throw new AppError('That therapist profile was not found.', 404);
  req.publicTherapist = therapist;
  next();
});
