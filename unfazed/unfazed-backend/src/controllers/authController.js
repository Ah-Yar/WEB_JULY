import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import Therapist from '../models/Therapist.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import generateUniqueSlug, { slugify } from '../utils/generateSlug.js';
import { createToken } from '../utils/tokens.js';

const publicTherapist = (therapist) => ({
  id: therapist._id,
  name: therapist.name,
  email: therapist.email,
  slug: therapist.slug,
  bio: therapist.bio,
  headline: therapist.headline,
  specializations: therapist.specializations,
  languages: therapist.languages,
  services: therapist.services,
  profilePhotoUrl: therapist.profilePhotoUrl,
  practiceDetails: therapist.practiceDetails,
  timezone: therapist.timezone,
  subscription: therapist.subscription,
  isProfilePublished: therapist.isProfilePublished,
  createdAt: therapist.createdAt
});

const checkValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Please correct the highlighted fields.', 422, errors.array().map(({ path, msg }) => ({ field: path, message: msg })));
};

export const register = asyncHandler(async (req, res) => {
  checkValidation(req);
  const { name, email, password, slug: requestedSlug } = req.body;
  if (await Therapist.exists({ email: email.toLowerCase() })) throw new AppError('An account with this email already exists.', 409);
  const candidate = requestedSlug ? slugify(requestedSlug) : name;
  if (!candidate) throw new AppError('Please choose a valid public-link slug.', 422);
  const slug = await generateUniqueSlug(candidate);
  const password_hash = await bcrypt.hash(password, 12);
  const therapist = await Therapist.create({ name, email, password_hash, slug });
  res.status(201).json({ token: createToken(therapist), therapist: publicTherapist(therapist) });
});

export const login = asyncHandler(async (req, res) => {
  checkValidation(req);
  const { email, password } = req.body;
  const therapist = await Therapist.findOne({ email: email.toLowerCase() }).select('+password_hash');
  if (!therapist || !(await bcrypt.compare(password, therapist.password_hash))) {
    throw new AppError('Email or password is incorrect.', 401);
  }
  res.json({ token: createToken(therapist), therapist: publicTherapist(therapist) });
});

export const me = asyncHandler(async (req, res) => res.json({ therapist: publicTherapist(req.therapist) }));
