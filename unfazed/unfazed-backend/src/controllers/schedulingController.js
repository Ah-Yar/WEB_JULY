import { DateTime } from 'luxon';
import Availability from '../models/Availability.js';
import BookingSlot from '../models/BookingSlot.js';
import Client from '../models/Client.js';
import ClientPackage from '../models/ClientPackage.js';
import Session from '../models/Session.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { buildOpenSlots, ensureSlotIsOpen, isValidTimezone } from '../services/availabilityService.js';
import { startCheckout } from '../services/paymentService.js';
import { notificationEvents } from '../services/notificationService.js';
import { createClientPortalToken } from '../utils/tokens.js';
import { ENTITLEMENT_KEYS, requireEntitlement } from '../services/entitlementService.js';

const normalizeWeeklySchedule = (weeklySchedule = []) => weeklySchedule.map((day) => ({
  dayOfWeek: Number(day.dayOfWeek),
  enabled: Boolean(day.enabled),
  slots: (day.slots || []).map((slot) => ({ start: slot.start, end: slot.end }))
}));

function normalizedBlockedSlots(blockedSlots = [], timezone) {
  return blockedSlots.map((block) => {
    const start = DateTime.fromISO(String(block.start), { zone: timezone });
    const end = DateTime.fromISO(String(block.end), { zone: timezone });
    if (!start.isValid || !end.isValid || end <= start) {
      throw new AppError('Each blocked period needs a valid end time after its start time.', 422);
    }
    return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate(), reason: block.reason || 'Unavailable' };
  });
}

function validateAvailability(input) {
  const durations = (input.sessionDurations || []).map(Number);
  if (!durations.length || durations.some((duration) => !Number.isInteger(duration) || duration < 15 || duration > 240)) {
    throw new AppError('Add at least one session duration between 15 and 240 minutes.', 422);
  }
  const ranges = [
    ...(input.weeklySchedule || []).flatMap((day) => day.slots || []),
    ...(input.overrides || []).flatMap((day) => day.slots || [])
  ];
  if (ranges.some((range) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(range.end) || range.start >= range.end)) {
    throw new AppError('Each availability range must have valid start and end times.', 422);
  }
}

export const getMyAvailability = asyncHandler(async (req, res) => {
  const availability = await Availability.findOne({ therapist: req.therapist._id });
  res.json({ availability: availability || { weeklySchedule: [], overrides: [], blockedSlots: [], sessionDurations: [50], bufferMinutes: 10, slotIntervalMinutes: 15 } });
});

export const updateMyAvailability = asyncHandler(async (req, res) => {
  validateAvailability(req.body);
  const update = {
    weeklySchedule: normalizeWeeklySchedule(req.body.weeklySchedule),
    overrides: req.body.overrides || [],
    // datetime-local values are interpreted as wall-clock time in the therapist's profile zone.
    blockedSlots: normalizedBlockedSlots(req.body.blockedSlots || [], req.therapist.timezone),
    sessionDurations: [...new Set(req.body.sessionDurations.map(Number))].sort((a, b) => a - b),
    bufferMinutes: Number(req.body.bufferMinutes || 0),
    slotIntervalMinutes: Number(req.body.slotIntervalMinutes || 15)
  };
  const availability = await Availability.findOneAndUpdate(
    { therapist: req.therapist._id },
    { $set: update, $setOnInsert: { therapist: req.therapist._id } },
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ availability });
});

export const getPublicSlots = asyncHandler(async (req, res) => {
  const { from, to, duration, timezone } = req.query;
  if (!from || !to) throw new AppError('from and to date parameters are required.', 422);
  const { availability, slots } = await buildOpenSlots({
    therapist: req.publicTherapist,
    from,
    to,
    durationMinutes: duration
  });
  const requestedZone = isValidTimezone(timezone) ? timezone : req.publicTherapist.timezone;
  res.json({
    therapistTimezone: req.publicTherapist.timezone,
    displayTimezone: requestedZone,
    sessionDurations: availability?.sessionDurations || [],
    slots: slots.map((slot) => ({
      ...slot,
      displayTime: DateTime.fromISO(slot.startsAt).setZone(requestedZone).toFormat("ccc, dd LLL · h:mm a"),
      displayEndsAt: DateTime.fromISO(slot.endsAt).setZone(requestedZone).toFormat('h:mm a')
    }))
  });
});

async function findOrCreateBookingClient({ therapistId, body, ipAddress }) {
  const { firstName, lastName, email, phone = '', consentAccepted, consentVersion = 'v1.0' } = body;
  if (!firstName || !lastName || !email) throw new AppError('Client name and email are required to book.', 422);
  const normalizedEmail = String(email).trim().toLowerCase();
  let client = await Client.findOne({ therapist: therapistId, email: normalizedEmail });
  if (client) {
    // A manually-created CRM entry must not become bookable without client consent.
    if (!client.consent?.isAccepted) {
      if (consentAccepted !== true) throw new AppError('Consent is required before booking.', 422);
      client.consent = { isAccepted: true, acceptedAt: new Date(), consentVersion, ipAddress };
      await client.save();
    }
    if (client.status !== 'active') await requireEntitlement(therapistId, ENTITLEMENT_KEYS.ACTIVE_CLIENTS);
    return client;
  }
  if (consentAccepted !== true) throw new AppError('Consent is required before booking.', 422);
  await requireEntitlement(therapistId, ENTITLEMENT_KEYS.ACTIVE_CLIENTS);
  client = await Client.create({
    therapist: therapistId,
    firstName,
    lastName,
    email: normalizedEmail,
    phone,
    status: 'active',
    consent: { isAccepted: true, acceptedAt: new Date(), consentVersion, ipAddress }
  });
  return client;
}

function locksForSession({ therapistId, sessionId, startsAt, totalMinutes, intervalMinutes }) {
  const locks = [];
  const start = new Date(startsAt).getTime();
  const end = start + totalMinutes * 60_000;
  for (let point = start; point < end; point += intervalMinutes * 60_000) {
    locks.push({ therapist: therapistId, session: sessionId, slotStart: new Date(point) });
  }
  return locks;
}

export const createPublicBooking = asyncHandler(async (req, res) => {
  const { startsAt, durationMinutes, client: clientInput = {}, clientTimezone, serviceId, clientPackageId } = req.body;
  if (!startsAt || !durationMinutes) throw new AppError('startsAt and durationMinutes are required.', 422);
  const { availability, slot } = await ensureSlotIsOpen({
    therapist: req.publicTherapist,
    startsAt,
    durationMinutes: Number(durationMinutes)
  });
  const client = await findOrCreateBookingClient({ therapistId: req.publicTherapist._id, body: clientInput, ipAddress: req.ip });
  const service = serviceId
    ? req.publicTherapist.services.id(serviceId)
    : req.publicTherapist.services.find((item) => item.isVisible !== false && item.durationMinutes === Number(durationMinutes));
  const serviceTitle = service?.title || `${durationMinutes}-minute therapy session`;
  const serviceAmount = Math.round(Number(service?.price || 0) * 100);

  let clientPackage = null;
  if (clientPackageId) {
    clientPackage = await ClientPackage.findOne({
      _id: clientPackageId,
      therapist: req.publicTherapist._id,
      client: client._id,
      status: 'active',
      expiresAt: { $gt: new Date() },
      remainingSessionCount: { $gt: 0 }
    });
    if (!clientPackage) throw new AppError('This package is not active, is expired, or has no sessions remaining.', 422);
  }

  const starts = new Date(slot.startsAt);
  let session;
  try {
    session = await Session.create({
      therapist: req.publicTherapist._id,
      client: client._id,
      startsAt: starts,
      endsAt: new Date(slot.endsAt),
      durationMinutes: Number(durationMinutes),
      bufferMinutes: availability.bufferMinutes,
      clientTimezone: isValidTimezone(clientTimezone) ? clientTimezone : req.publicTherapist.timezone,
      bookingSource: 'public',
      serviceTitle,
      amount: clientPackage ? 0 : serviceAmount,
      paymentStatus: clientPackage ? 'package' : serviceAmount ? 'pending' : 'not_required',
      ...(clientPackage ? { clientPackage: clientPackage._id } : {})
    });
  } catch (error) {
    if (error.code === 11000) throw new AppError('This slot was just booked by someone else. Please select another time.', 409);
    throw error;
  }

  try {
    await BookingSlot.insertMany(locksForSession({
      therapistId: req.publicTherapist._id,
      sessionId: session._id,
      startsAt: starts,
      totalMinutes: Number(durationMinutes) + availability.bufferMinutes,
      intervalMinutes: availability.slotIntervalMinutes
    }), { ordered: true });
  } catch (error) {
    await Promise.all([BookingSlot.deleteMany({ session: session._id }), Session.deleteOne({ _id: session._id })]);
    if (error.code === 11000) throw new AppError('This slot was just booked by someone else. Please select another time.', 409);
    throw error;
  }

  let checkout = null;
  if (clientPackage) {
    clientPackage.remainingSessionCount -= 1;
    clientPackage.redemptions.push({ session: session._id });
    if (clientPackage.remainingSessionCount === 0) clientPackage.status = 'exhausted';
    await clientPackage.save();
  } else if (serviceAmount > 0) {
    try {
      const result = await startCheckout({
        therapist: req.publicTherapist,
        client,
        session,
        amount: serviceAmount,
        type: 'session',
        description: `${serviceTitle} · ${durationMinutes} minutes`
      });
      checkout = result.checkout;
    } catch (error) {
      // Keep the booking and its slot reservation intact; staff can resend a payment request.
      session.paymentStatus = 'failed';
      await session.save();
      throw new AppError('Your time is reserved, but the payment checkout could not be created. Please contact the practice.', 502);
    }
  }

  await Client.updateOne({ _id: client._id }, { $set: { status: 'active', lastSessionDate: starts } });
  notificationEvents.bookingConfirmed({ session, therapist: req.publicTherapist, client }).catch(() => undefined);
  res.status(201).json({
    message: checkout ? 'Your time is reserved. Complete payment to confirm it.' : 'Your session is confirmed.',
    booking: { id: session._id, startsAt: session.startsAt, endsAt: session.endsAt, durationMinutes: session.durationMinutes, therapistName: req.publicTherapist.name, paymentStatus: session.paymentStatus },
    ...(checkout ? { checkout } : {}),
    portalAccessToken: createClientPortalToken(client)
  });
});

export const listMySessions = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;
  const query = { therapist: req.therapist._id };
  if (status) query.status = status;
  if (from || to) query.startsAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
  const sessions = await Session.find(query).populate('client', 'firstName lastName email phone').sort({ startsAt: 1 });
  res.json({ sessions });
});

export const updateSessionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled', 'no_show'].includes(status)) throw new AppError('Invalid session status.', 422);
  const session = await Session.findOne({ _id: req.params.sessionId, therapist: req.therapist._id });
  if (!session) throw new AppError('Session not found.', 404);
  session.status = status;
  await session.save();
  if (status === 'cancelled') await BookingSlot.deleteMany({ session: session._id });
  if (status === 'completed') {
    const client = await Client.findById(session.client);
    if (client) notificationEvents.postSessionFollowUp({ session, therapist: req.therapist, client }).catch(() => undefined);
  }
  res.json({ session });
});
