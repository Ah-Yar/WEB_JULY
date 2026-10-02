import bcrypt from 'bcryptjs';
import Therapist from '../models/Therapist.js';
import Availability from '../models/Availability.js';

export default async function seedDemoData() {
  const password_hash = await bcrypt.hash('DemoPass123!', 12);
  const therapist = await Therapist.findOneAndUpdate(
    { email: 'ananya@example.com' },
    {
      name: 'Dr. Ananya Shah', email: 'ananya@example.com', password_hash, slug: 'dr-ananya',
      headline: 'A calmer space to make sense of what you are carrying.',
      bio: 'Trauma-informed counselling for adults navigating anxiety, relationships, and life transitions.',
      specializations: ['Anxiety', 'Relationships', 'Life transitions'], languages: ['English', 'Hindi', 'Gujarati'],
      services: [
        { title: 'Individual therapy', description: 'A focused, confidential one-to-one session.', durationMinutes: 50, price: 1800 },
        { title: 'Extended session', description: 'More time for complex themes or deeper work.', durationMinutes: 60, price: 2200 }
      ]
    }, { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await Availability.findOneAndUpdate({ therapist: therapist._id }, {
    therapist: therapist._id,
    weeklySchedule: [
      { dayOfWeek: 1, enabled: true, slots: [{ start: '10:00', end: '16:00' }] },
      { dayOfWeek: 3, enabled: true, slots: [{ start: '10:00', end: '18:00' }] },
      { dayOfWeek: 6, enabled: true, slots: [{ start: '09:00', end: '13:00' }] }
    ], sessionDurations: [50, 60], bufferMinutes: 10, slotIntervalMinutes: 15
  }, { new: true, upsert: true });
  return therapist;
}
