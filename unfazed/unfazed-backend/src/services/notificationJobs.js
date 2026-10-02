import Session from '../models/Session.js';
import { notificationEvents } from './notificationService.js';

async function sendDueReminders() {
  const now = Date.now();
  const windowStart = new Date(now + 23.75 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 24.25 * 60 * 60 * 1000);
  const sessions = await Session.find({ status: 'scheduled', startsAt: { $gte: windowStart, $lte: windowEnd } }).populate('therapist').populate('client');
  await Promise.all(sessions.map((session) => notificationEvents.sessionReminder({ session, therapist: session.therapist, client: session.client })));
}

/** Run immediately and then every 15 minutes; idempotent event keys prevent duplicate reminders. */
export function startNotificationJobs() {
  const run = () => sendDueReminders().catch((error) => console.error('Reminder job failed:', error.message));
  run();
  return setInterval(run, 15 * 60 * 1000);
}
