import { Router } from 'express';
import { changeDemoTier, getSubscription } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/', getSubscription);
router.post('/demo-switch-tier', changeDemoTier);
export default router;
