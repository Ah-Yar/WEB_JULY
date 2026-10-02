import { Router } from 'express';
import { listMySessions, updateSessionStatus } from '../controllers/schedulingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/', listMySessions);
router.patch('/:sessionId/status', updateSessionStatus);
export default router;
