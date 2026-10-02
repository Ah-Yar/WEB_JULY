import crypto from 'crypto';
import ClientPackage from '../models/ClientPackage.js';
import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import { getRazorpayClient, hasRazorpayCredentials } from '../config/razorpay.js';
import { generateInvoice } from './invoiceService.js';
import { notificationEvents } from './notificationService.js';

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const makeCheckoutToken = () => crypto.randomBytes(32).toString('hex');

export function checkoutTokenMatches(payment, token) {
  if (!token || !payment.checkoutTokenHash) return false;
  const supplied = Buffer.from(tokenHash(token));
  const expected = Buffer.from(payment.checkoutTokenHash);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function paymentSummary(payment) {
  return {
    id: payment._id,
    description: payment.description,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    type: payment.type,
    invoiceUrl: payment.invoiceUrl,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt
  };
}

export async function startCheckout({ therapist, client, session, clientPackage, amount, type, description }) {
  const checkoutToken = makeCheckoutToken();
  const receiptNumber = `UFZ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const payment = await Payment.create({
    therapist: therapist._id,
    client: client._id,
    ...(session ? { session: session._id } : {}),
    ...(clientPackage ? { clientPackage: clientPackage._id } : {}),
    type,
    description,
    amount,
    netAmount: amount,
    gateway: hasRazorpayCredentials() ? 'razorpay' : 'demo',
    receiptNumber,
    checkoutTokenHash: tokenHash(checkoutToken)
  });

  let checkout;
  const razorpay = getRazorpayClient();
  if (razorpay) {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: receiptNumber.slice(0, 40),
      notes: { paymentId: payment._id.toString(), therapistId: therapist._id.toString(), type }
    });
    payment.razorpayOrderId = order.id;
    await payment.save();
    checkout = { mode: 'razorpay', orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount, currency: 'INR' };
  } else {
    payment.razorpayOrderId = `demo_order_${payment._id}`;
    await payment.save();
    checkout = { mode: 'demo', orderId: payment.razorpayOrderId, amount, currency: 'INR' };
  }

  if (session) {
    session.payment = payment._id;
    session.paymentStatus = 'pending';
    await session.save();
  }
  if (clientPackage) {
    clientPackage.payment = payment._id;
    await clientPackage.save();
  }
  return { payment, checkout: { paymentId: payment._id.toString(), checkoutToken, ...checkout } };
}

export function verifyRazorpayCheckout({ orderId, paymentId, signature }) {
  if (!hasRazorpayCredentials() || !signature) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex'));
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

export function verifyWebhookSignature(body, signature) {
  if (!hasRazorpayCredentials() || !signature) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex'));
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

export async function markPaymentCaptured(payment, { transactionId, payload, source = 'webhook' } = {}) {
  if (payment.status === 'captured') return payment;
  payment.status = 'captured';
  payment.paidAt = new Date();
  if (transactionId) payment.gatewayTransactionId = transactionId;
  if (payload) payment.gatewayPayload = payload;
  await payment.save();

  if (payment.session) {
    await Session.updateOne({ _id: payment.session }, { $set: { paymentStatus: 'paid', payment: payment._id } });
  }
  if (payment.clientPackage) {
    const clientPackage = await ClientPackage.findById(payment.clientPackage);
    if (clientPackage && clientPackage.status === 'pending') {
      clientPackage.status = 'active';
      clientPackage.purchasedAt = payment.paidAt;
      await clientPackage.save();
    }
  }

  const populated = await Payment.findById(payment._id).populate('therapist').populate('client');
  await generateInvoice({ payment: populated, therapist: populated.therapist, client: populated.client });
  notificationEvents.paymentCaptured({ payment: populated, therapist: populated.therapist, client: populated.client }).catch(() => undefined);
  return populated;
}

export async function markPaymentFailed(payment, payload) {
  if (payment.status === 'captured' || payment.status === 'refunded') return payment;
  payment.status = 'failed';
  payment.gatewayPayload = payload;
  await payment.save();
  if (payment.session) await Session.updateOne({ _id: payment.session }, { $set: { paymentStatus: 'failed' } });
  return payment;
}
