import Therapist from '../models/Therapist.js';

export const slugify = (value = '') => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-')
  .slice(0, 48);

export default async function generateUniqueSlug(candidate) {
  const base = slugify(candidate) || 'therapist';
  let slug = base;
  let count = 2;
  while (await Therapist.exists({ slug })) {
    slug = `${base}-${count}`;
    count += 1;
  }
  return slug;
}
