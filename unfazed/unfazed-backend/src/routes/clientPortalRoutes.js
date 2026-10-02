import { Router } from 'express';
import { listClientPortalMessages } from '../controllers/chatController.js';
import { listClientNotifications, readClientNotifications } from '../controllers/notificationController.js';
import { listClientPortalNotes } from '../controllers/noteController.js';
import { protectClientPortal } from '../middleware/clientPortalMiddleware.js';

const router = Router();
router.use(protectClientPortal);
router.get('/me/notes', listClientPortalNotes);
router.get('/messages', listClientPortalMessages);
router.get('/notifications', listClientNotifications);
router.post('/notifications/read-all', readClientNotifications);
export default router;
