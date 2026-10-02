import { DateTime } from 'luxon';
import Availability from '../models/Availability.js';
import Session from '../models/Session.js';

export function isValidTimezone(timezone) {
  return Boolean(timezone) && DateTime.now().setZone(timezone).isValid;
}

function timeOnDate(date, time, zone) {
  const [hour, minute] = time.split(':').map(Number);
  return date.set({ hour, minute, second: 0, millisecond: 0 }).setZone(zone, { keepLocalTime: true });
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export async function getAvailabilityForTherapist(therapistId) {
  return Availability.findOne({ therapist: therapistId });
}

/**
 * Generates actual availability from a therapist-local weekly template. Database timestamps are
 * always UTC; the timezone is only used while interpreting weekly wall-clock availability.
 */
export async function buildOpenSlots({ therapist, from, to, durationMinutes }) {
  const availability = await Availability.findOne({ therapist: therapist._id }).lean();
  if (!availability) return { availability: null, slots: [] };

  const zone = isValidTimezone(therapist.timezone) ? therapist.timezone : 'Asia/Kolkata';
  const requestedDuration = Number(durationMinutes || availability.sessionDurations?.[0] || 50);
  if (!availability.sessionDurations.includes(requestedDuration)) {
    const error = new Error('That session duration is not offered by this therapist.');
    error.statusCode = 422;
    throw error;
  }

  const rangeStart = DateTime.fromISO(from, { zone }).startOf('day');
  const rangeEnd = DateTime.fromISO(to, { zone }).endOf('day');
  if (!rangeStart.isValid || !rangeEnd.isValid || rangeEnd < rangeStart) {
    const error = new Error('Use valid dates in YYYY-MM-DD format.');
    error.statusCode = 422;
    throw error;
  }
  if (rangeEnd.diff(rangeStart, 'days').days > 62) {
    const error = new Error('Availability can be requested for a maximum of 63 days at a time.');
    error.statusCode = 422;
    throw error;
  }

  const queryStart = rangeStart.toUTC().toJSDate();
  const queryEnd = rangeEnd.plus({ days: 1 }).startOf('day').toUTC().toJSDate();
  const scheduled = await Session.find({
    therapist: therapist._id,
    status: 'scheduled',
    startsAt: { $lt: queryEnd },
    endsAt: { $gt: queryStart }
  }).lean();

  const blocked = availability.blockedSlots || [];
  const slots = [];
  let cursor = rangeStart;
  const today = DateTime.now().setZone(zone).startOf('minute');

  while (cursor <= rangeEnd) {
    const dateKey = cursor.toISODate();
    const override = (availability.overrides || []).find((item) => item.dateKey === dateKey);
    let ranges = [];
    if (override) ranges = override.isBlocked ? [] : override.slots;
    else {
      const weekly = (availability.weeklySchedule || []).find((item) => item.dayOfWeek === cursor.weekday % 7);
      ranges = weekly?.enabled ? weekly.slots : [];
    }

    for (const range of ranges) {
      let slotStart = timeOnDate(cursor, range.start, zone);
      const rangeEndTime = timeOnDate(cursor, range.end, zone);
      const fullLength = requestedDuration + availability.bufferMinutes;
      while (slotStart.plus({ minutes: fullLength }) <= rangeEndTime) {
        const slotEnd = slotStart.plus({ minutes: requestedDuration });
        const protectedEnd = slotStart.plus({ minutes: fullLength });
        const startJS = slotStart.toUTC().toJSDate();
        const endJS = protectedEnd.toUTC().toJSDate();
        const isBlocked = blocked.some((item) => overlaps(startJS, endJS, new Date(item.start), new Date(item.end)));
        const isBooked = scheduled.some((item) => overlaps(startJS, endJS, item.startsAt, new Date(item.endsAt).getTime() + (item.bufferMinutes || 0) * 60000));
        if (slotStart >= today && !isBlocked && !isBooked) {
          slots.push({
            startsAt: slotStart.toUTC().toISO(),
            endsAt: slotEnd.toUTC().toISO(),
            durationMinutes: requestedDuration,
            therapistTimezone: zone
          });
        }
        slotStart = slotStart.plus({ minutes: availability.slotIntervalMinutes });
      }
    }
    cursor = cursor.plus({ days: 1 }).startOf('day');
  }

  return { availability, slots };
}

export async function ensureSlotIsOpen({ therapist, startsAt, durationMinutes }) {
  const parsed = DateTime.fromISO(startsAt, { setZone: true });
  if (!parsed.isValid || !startsAt.match(/(Z|[+-]\d\d:\d\d)$/)) {
    const error = new Error('startsAt must be an ISO 8601 timestamp including a timezone offset.');
    error.statusCode = 422;
    throw error;
  }
  const zone = isValidTimezone(therapist.timezone) ? therapist.timezone : 'Asia/Kolkata';
  const localDate = parsed.setZone(zone).toISODate();
  const { availability, slots } = await buildOpenSlots({
    therapist,
    from: localDate,
    to: localDate,
    durationMinutes
  });
  const found = slots.find((slot) => new Date(slot.startsAt).getTime() === parsed.toUTC().toMillis());
  if (!found) {
    const error = new Error('This slot is no longer available. Please choose another time.');
    error.statusCode = 409;
    throw error;
  }
  return { availability, slot: found };
}
