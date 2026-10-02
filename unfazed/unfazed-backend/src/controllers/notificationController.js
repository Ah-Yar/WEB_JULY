import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

const listFor = async ({ recipientType, recipientId }) => {
  const notifications = await Notification.find({ recipientType, recipientId, channel: 'in_app' }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  return { notifications, unreadCount };
};

export const listTherapistNotifications = asyncHandler(async (req, res) => {
  res.json(await listFor({ recipientType: 'therapist', recipientId: req.therapist._id }));
});

export const readTherapistNotifications = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipientType: 'therapist', recipientId: req.therapist._id, channel: 'in_app', readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.status(204).send();
});

export const listClientNotifications = asyncHandler(async (req, res) => {
  res.json(await listFor({ recipientType: 'client', recipientId: req.portalClient._id }));
});

export const readClientNotifications = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipientType: 'client', recipientId: req.portalClient._id, channel: 'in_app', readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.status(204).send();
});
