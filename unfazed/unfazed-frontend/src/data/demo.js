export const demoTherapist = {
  _id: 'demo-ananya', name: 'Dr. Ananya Shah', slug: 'dr-ananya',
  headline: 'A calmer space to make sense of what you are carrying.',
  bio: 'Trauma-informed counselling for adults navigating anxiety, relationships, and life transitions. Sessions are collaborative, gentle, and shaped around your pace.',
  specializations: ['Anxiety', 'Relationships', 'Life transitions'],
  languages: ['English', 'Hindi', 'Gujarati'], timezone: 'Asia/Kolkata',
  services: [
    { _id: 'individual', title: 'Individual therapy', description: 'A focused, confidential one-to-one session.', durationMinutes: 50, price: 1800 },
    { _id: 'extended', title: 'Extended session', description: 'More time for complex themes or deeper work.', durationMinutes: 60, price: 2200 }
  ]
};

export function dateKey(date) { return date.toISOString().slice(0, 10); }
export function addDays(days) { const date = new Date(); date.setDate(date.getDate() + days); return dateKey(date); }
