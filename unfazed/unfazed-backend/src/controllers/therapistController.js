import Therapist from '../models/Therapist.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import generateUniqueSlug, { slugify } from '../utils/generateSlug.js';

const cleanList = (values) => Array.isArray(values) ? [...new Set(values.map((item) => String(item).trim()).filter(Boolean))] : [];
const publicFields = 'name slug bio headline specializations languages services profilePhotoUrl timezone isProfilePublished createdAt';

export const getPublicProfile = asyncHandler(async (req, res) => {
  const therapist = await Therapist.findOne({ slug: req.params.slug.toLowerCase(), isProfilePublished: true }).select(publicFields).lean();
  if (!therapist) throw new AppError('That therapist profile was not found.', 404);
  therapist.services = (therapist.services || []).filter((service) => service.isVisible !== false);
  res.json({ therapist });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'headline', 'profilePhotoUrl', 'timezone', 'isProfilePublished', 'practiceDetails'];
  allowed.forEach((key) => {
    if (Object.hasOwn(req.body, key)) req.therapist[key] = req.body[key];
  });
  if (Object.hasOwn(req.body, 'specializations')) req.therapist.specializations = cleanList(req.body.specializations);
  if (Object.hasOwn(req.body, 'languages')) req.therapist.languages = cleanList(req.body.languages);
  if (Object.hasOwn(req.body, 'services')) req.therapist.services = Array.isArray(req.body.services) ? req.body.services.map((item) => ({
    title: String(item.title || '').trim(),
    description: String(item.description || '').trim(),
    durationMinutes: Number(item.durationMinutes || 50),
    price: Number(item.price || 0),
    isVisible: item.isVisible !== false
  })) : [];

  if (req.body.slug && slugify(req.body.slug) !== req.therapist.slug) {
    req.therapist.slug = await generateUniqueSlug(req.body.slug);
  }
  await req.therapist.save();
  res.json({ therapist: req.therapist });
});
