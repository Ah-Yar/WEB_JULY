import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import clientPortalRoutes from './routes/clientPortalRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import schedulingRoutes from './routes/schedulingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import therapistRoutes from './routes/therapistRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((url) => url.trim());
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') return callback(null, true); return callback(new Error('Origin not allowed by CORS')); }, credentials: false }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Razorpay signs the exact raw request bytes. This must be registered before express.json().
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), webhookRoutes);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded', service: 'unfazed-api', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sessions', schedulingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/public', publicRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
