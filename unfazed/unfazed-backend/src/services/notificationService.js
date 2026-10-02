import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';

let realtimeEmitter = null;
let transporter = null;

export function setRealtimeNotificationEmitter(emitter) {
  realtimeEmitter = emitter;
}

function configuredTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

async function createOnce(data) {
  try {
    return await Notification.create(data);
  } catch (error) {
    // Event keys make notifications idempotent: retries/jobs cannot send duplicates.
    if (error.code === 11000) return null;
    throw error;
  }
}

async function sendEmail({ recipient, title, body, base }) {
  const transport = configuredTransporter();
  if (!recipient.email) return;
  const notification = await createOnce({ ...base, channel: 'email', eventKey: `${base.eventKey}:email`, status: transport ? 'queued' : 'stubbed' });
  if (!notification) return;
  if (!transport) {
    console.info(`[notification:email:stub] To ${recipient.email} — ${title}: ${body}`);
    return;
  }
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM || 'Unfazed <no-reply@unfazed.local>', to: recipient.email, subject: title, text: body });
    notification.status = 'sent';
  } catch (error) {
    notification.status = 'failed';
    notification.metadata = { ...(notification.metadata || {}), emailError: error.message };
  }
  await notification.save();
}

async function sendWhatsAppStub({ recipient, title, body, base }) {
  if (!recipient.phone) return;
  const notification = await createOnce({ ...base, channel: 'whatsapp_stub', eventKey: `${base.eventKey}:whatsapp`, status: 'stubbed' });
  if (!notification) return;
  console.info(`[notification:whatsapp:stub] To ${recipient.phone} — ${title}: ${body}`);
}

/** Dispatch one domain event to in-app, email, and WhatsApp-stub channels. */
export async function notify({ therapist, client, recipientType, type, eventKey, title, body, metadata = {} }) {
  const recipient = recipientType === 'therapist' ? therapist : client;
  if (!recipient) return;
  const base = {
    therapist: therapist._id,
    ...(client ? { client: client._id } : {}),
    recipientType,
    recipientId: recipient._id,
    type,
    title,
    body,
    metadata,
    eventKey: `${eventKey}:${recipientType}`
  };
  try {
    const inApp = await createOnce({ ...base, channel: 'in_app', eventKey: `${base.eventKey}:inapp`, status: 'sent' });
    if (inApp && realtimeEmitter) realtimeEmitter({ recipientType, recipientId: recipient._id.toString(), notification: inApp.toJSON() });
    await Promise.all([sendEmail({ recipient, title, body, base }), sendWhatsAppStub({ recipient, title, body, base })]);
  } catch (error) {
    // Notifications must not roll back a confirmed booking/payment/message.
    console.error('Notification dispatch failed:', error.message);
  }
}

const formatSessionTime = (session, therapist) => new Date(session.startsAt).toLocaleString('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: therapist.timezone || 'Asia/Kolkata'
});

export const notificationEvents = {
  bookingConfirmed: ({ session, therapist, client }) => notify({
    therapist, client, recipientType: 'client', type: 'booking_confirmed', eventKey: `booking:${session._id}`,
    title: 'Your session is reserved', body: `Your session with ${therapist.name} is scheduled for ${formatSessionTime(session, therapist)}.`, metadata: { sessionId: session._id }
  }),
  paymentCaptured: ({ payment, therapist, client }) => notify({
    therapist, client, recipientType: 'client', type: 'payment_captured', eventKey: `payment:${payment._id}`,
    title: 'Payment confirmed', body: `We received ${Number(payment.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} for ${payment.description}.`, metadata: { paymentId: payment._id, invoiceUrl: payment.invoiceUrl }
  }),
  sessionReminder: ({ session, therapist, client }) => notify({
    therapist, client, recipientType: 'client', type: 'session_reminder', eventKey: `reminder:${session._id}`,
    title: 'A gentle session reminder', body: `You have a session with ${therapist.name} in approximately 24 hours (${formatSessionTime(session, therapist)}).`, metadata: { sessionId: session._id }
  }),
  postSessionFollowUp: ({ session, therapist, client }) => notify({
    therapist, client, recipientType: 'client', type: 'post_session_follow_up', eventKey: `followup:${session._id}`,
    title: 'Thank you for showing up', body: `We hope you can carry something useful from today’s session with ${therapist.name}.`, metadata: { sessionId: session._id }
  }),
  newChatMessage: ({ therapist, client, senderType, message }) => notify({
    therapist, client, recipientType: senderType === 'therapist' ? 'client' : 'therapist', type: 'new_message', eventKey: `message:${message._id}`,
    title: `New message from ${senderType === 'therapist' ? therapist.name : `${client.firstName} ${client.lastName}`}`,
    body: message.content.slice(0, 160), metadata: { clientId: client._id, messageId: message._id }
  })
};
