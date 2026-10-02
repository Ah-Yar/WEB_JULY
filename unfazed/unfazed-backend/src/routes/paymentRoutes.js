import { Router } from 'express';
import { downloadTherapistInvoice, listPayments } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/', listPayments);
router.get('/:paymentId/invoice', downloadTherapistInvoice);
export default router;
