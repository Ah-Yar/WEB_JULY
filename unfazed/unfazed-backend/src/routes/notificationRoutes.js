import { Router } from 'express';
import { listTherapistNotifications, readTherapistNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/', listTherapistNotifications);
router.post('/read-all', readTherapistNotifications);
export default router;
