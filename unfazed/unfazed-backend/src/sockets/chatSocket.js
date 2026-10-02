import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import ChatMessage from '../models/ChatMessage.js';
import Client from '../models/Client.js';
import Therapist from '../models/Therapist.js';
import { setRealtimeNotificationEmitter, notificationEvents } from '../services/notificationService.js';

const roomForConversation = (therapistId, clientId) => `conversation:${therapistId}:${clientId}`;
const roomForUser = (type, id) => `user:${type}:${id}`;

async function verifySocketToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.role === 'therapist') {
    const therapist = await Therapist.findById(payload.sub);
    if (!therapist) throw new Error('Therapist account not found');
    return { type: 'therapist', id: therapist._id.toString(), therapist };
  }
  if (payload.role === 'client_portal') {
    const client = await Client.findOne({ _id: payload.sub, therapist: payload.therapistId });
    if (!client) throw new Error('Client account not found');
    return { type: 'client', id: client._id.toString(), client, therapistId: client.therapist.toString() };
  }
  throw new Error('Unsupported account role');
}

async function authorizeConversation(user, clientId) {
  if (user.type === 'therapist') {
    const client = await Client.findOne({ _id: clientId, therapist: user.therapist._id });
    if (!client) throw new Error('Client not found in your practice');
    return { therapist: user.therapist, client };
  }
  if (user.id !== String(clientId)) throw new Error('You cannot access another client conversation');
  const therapist = await Therapist.findById(user.therapistId);
  return { therapist, client: user.client };
}

export function initializeChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL?.split(',').map((value) => value.trim()) || true, methods: ['GET', 'POST'] }
  });
  setRealtimeNotificationEmitter(({ recipientType, recipientId, notification }) => io.to(roomForUser(recipientType, recipientId)).emit('notification:new', notification));

  io.use(async (socket, next) => {
    try {
      socket.data.user = await verifySocketToken(socket.handshake.auth?.token);
      next();
    } catch (_error) {
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(roomForUser(user.type, user.id));

    socket.on('conversation:join', async ({ clientId }, acknowledge = () => {}) => {
      try {
        const { therapist, client } = await authorizeConversation(user, clientId);
        const room = roomForConversation(therapist._id, client._id);
        socket.join(room);
        acknowledge({ ok: true, room });
      } catch (error) { acknowledge({ ok: false, error: error.message }); }
    });

    socket.on('typing:update', async ({ clientId, isTyping }) => {
      try {
        const { therapist, client } = await authorizeConversation(user, clientId);
        socket.to(roomForConversation(therapist._id, client._id)).emit('typing:update', { senderType: user.type, isTyping: Boolean(isTyping) });
      } catch (_error) { /* silently ignore unauthorized typing events */ }
    });

    socket.on('message:send', async ({ clientId, content }, acknowledge = () => {}) => {
      try {
        const cleanContent = String(content || '').trim();
        if (!cleanContent || cleanContent.length > 4000) throw new Error('Message must be between 1 and 4000 characters');
        const { therapist, client } = await authorizeConversation(user, clientId);
        const message = await ChatMessage.create({ therapist: therapist._id, client: client._id, senderType: user.type, senderId: user.id, content: cleanContent });
        const serialized = message.toJSON();
        io.to(roomForConversation(therapist._id, client._id)).emit('message:new', serialized);
        acknowledge({ ok: true, message: serialized });
        notificationEvents.newChatMessage({ therapist, client, senderType: user.type, message }).catch(() => undefined);
      } catch (error) { acknowledge({ ok: false, error: error.message }); }
    });

    socket.on('message:read', async ({ clientId }) => {
      try {
        const { therapist, client } = await authorizeConversation(user, clientId);
        const opposite = user.type === 'therapist' ? 'client' : 'therapist';
        await ChatMessage.updateMany({ therapist: therapist._id, client: client._id, senderType: opposite, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
        io.to(roomForConversation(therapist._id, client._id)).emit('message:read', { by: user.type, at: new Date().toISOString() });
      } catch (_error) { /* silently ignore unauthorized read events */ }
    });
  });
  return io;
}
