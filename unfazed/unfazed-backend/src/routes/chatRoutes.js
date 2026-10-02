import { Router } from 'express';
import { listTherapistMessages } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/:clientId/messages', listTherapistMessages);
export default router;
