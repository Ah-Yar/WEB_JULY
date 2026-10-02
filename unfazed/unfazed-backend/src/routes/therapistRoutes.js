import { Router } from 'express';
import { getPublicProfile, updateMyProfile } from '../controllers/therapistController.js';
import { getMyAvailability, updateMyAvailability } from '../controllers/schedulingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/public/:slug', getPublicProfile);
router.use(protect);
router.patch('/me/profile', updateMyProfile);
router.get('/me/availability', getMyAvailability);
router.put('/me/availability', updateMyAvailability);
export default router;
