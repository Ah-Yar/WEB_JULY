import { Router } from 'express';
import { razorpayWebhook } from '../controllers/paymentController.js';

const router = Router();
router.post('/', razorpayWebhook);
export default router;
