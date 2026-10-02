import fs from 'fs';
import path from 'path';
import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { checkoutTokenMatches, markPaymentCaptured, markPaymentFailed, paymentSummary, verifyRazorpayCheckout, verifyWebhookSignature } from '../services/paymentService.js';

const invoiceDirectory = path.resolve(process.cwd(), 'storage/invoices');

async function findCheckoutPayment(paymentId, token) {
  const payment = await Payment.findById(paymentId).select('+checkoutTokenHash');
  if (!payment || !checkoutTokenMatches(payment, token)) throw new AppError('This checkout link is invalid or has expired.', 401);
  return payment;
}

export const listPayments = asyncHandler(async (req, res) => {
  const query = { therapist: req.therapist._id };
  if (req.query.status) query.status = req.query.status;
  if (req.query.type) query.type = req.query.type;
  const payments = await Payment.find(query).populate('client', 'firstName lastName email').populate('session', 'startsAt durationMinutes').sort({ createdAt: -1 }).limit(200);
  res.json({ payments: payments.map((payment) => ({ ...paymentSummary(payment), client: payment.client, session: payment.session, invoiceUrl: payment.invoiceUrl ? `/api/payments/${payment._id}/invoice` : null })) });
});

export const getPublicPayment = asyncHandler(async (req, res) => {
  const payment = await findCheckoutPayment(req.params.paymentId, req.query.token);
  res.json({
    payment: {
      ...paymentSummary(payment),
      invoiceUrl: payment.invoiceUrl ? `${payment.invoiceUrl}?token=${encodeURIComponent(req.query.token)}` : null,
      checkout: {
        mode: payment.gateway === 'demo' ? 'demo' : 'razorpay',
        orderId: payment.razorpayOrderId,
        keyId: payment.gateway === 'razorpay' ? process.env.RAZORPAY_KEY_ID : undefined
      }
    }
  });
});

export const confirmDemoPayment = asyncHandler(async (req, res) => {
  const payment = await findCheckoutPayment(req.params.paymentId, req.body.checkoutToken);
  if (payment.gateway !== 'demo') throw new AppError('Demo confirmation is unavailable for this payment.', 400);
  const captured = await markPaymentCaptured(payment, { transactionId: `demo_payment_${payment._id}`, payload: { mode: 'demo', confirmedAt: new Date().toISOString() }, source: 'demo' });
  res.json({ message: 'Demo payment confirmed and invoice generated.', payment: paymentSummary(captured) });
});

export const verifyCheckout = asyncHandler(async (req, res) => {
  const { checkoutToken, razorpay_payment_id: transactionId, razorpay_order_id: orderId, razorpay_signature: signature } = req.body;
  const payment = await findCheckoutPayment(req.params.paymentId, checkoutToken);
  if (payment.gateway !== 'razorpay') throw new AppError('Use the demo confirmation route for this development checkout.', 400);
  if (payment.razorpayOrderId !== orderId || !verifyRazorpayCheckout({ orderId, paymentId: transactionId, signature })) {
    throw new AppError('Payment signature verification failed.', 400);
  }
  payment.status = 'authorized';
  payment.gatewayTransactionId = transactionId;
  payment.gatewayPayload = { orderId, transactionId, signature, verifiedAt: new Date().toISOString() };
  await payment.save();
  if (payment.session) await Session.updateOne({ _id: payment.session }, { $set: { paymentStatus: 'authorized' } });
  res.json({ message: 'Payment verified. Awaiting secure gateway confirmation.', payment: paymentSummary(payment) });
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const rawBody = req.body;
  const signature = req.headers['x-razorpay-signature'];
  if (!Buffer.isBuffer(rawBody) || !verifyWebhookSignature(rawBody, signature)) throw new AppError('Webhook signature verification failed.', 400);
  const payload = JSON.parse(rawBody.toString('utf8'));
  const entity = payload?.payload?.payment?.entity || payload?.payload?.refund?.entity;
  const orderId = entity?.order_id;
  const payment = orderId ? await Payment.findOne({ razorpayOrderId: orderId }).select('+checkoutTokenHash') : null;
  if (!payment) return res.status(200).json({ received: true, ignored: true });

  if (payload.event === 'payment.captured') await markPaymentCaptured(payment, { transactionId: entity.id, payload, source: 'webhook' });
  if (payload.event === 'payment.failed') await markPaymentFailed(payment, payload);
  if (payload.event === 'refund.processed') {
    payment.status = 'refunded';
    payment.gatewayPayload = payload;
    await payment.save();
    if (payment.session) await Session.updateOne({ _id: payment.session }, { $set: { paymentStatus: 'refunded' } });
  }
  res.status(200).json({ received: true });
});

export const downloadTherapistInvoice = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.paymentId, therapist: req.therapist._id });
  if (!payment?.invoiceFileName) throw new AppError('The invoice is not available yet.', 404);
  const filePath = path.join(invoiceDirectory, path.basename(payment.invoiceFileName));
  if (!fs.existsSync(filePath)) throw new AppError('The invoice file could not be found.', 404);
  res.download(filePath, payment.invoiceFileName);
});

export const downloadPublicInvoice = asyncHandler(async (req, res) => {
  const payment = await findCheckoutPayment(req.params.paymentId, req.query.token);
  if (!payment.invoiceFileName) throw new AppError('The invoice is not available yet.', 404);
  const filePath = path.join(invoiceDirectory, path.basename(payment.invoiceFileName));
  if (!fs.existsSync(filePath)) throw new AppError('The invoice file could not be found.', 404);
  res.download(filePath, payment.invoiceFileName);
});
