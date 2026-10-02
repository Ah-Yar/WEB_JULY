import { Router } from 'express';
import { submitPublicIntake } from '../controllers/clientController.js';
import { downloadPublicInvoice, confirmDemoPayment, getPublicPayment, verifyCheckout } from '../controllers/paymentController.js';
import { listPublicPackages, purchasePublicPackage } from '../controllers/packageController.js';
import { createPublicBooking, getPublicSlots } from '../controllers/schedulingController.js';
import { loadPublicTherapist } from '../middleware/publicTherapistMiddleware.js';

const router = Router();
router.use('/therapists/:slug', loadPublicTherapist);
router.get('/therapists/:slug/availability', getPublicSlots);
router.post('/therapists/:slug/intake', submitPublicIntake);
router.post('/therapists/:slug/bookings', createPublicBooking);
router.get('/therapists/:slug/packages', listPublicPackages);
router.post('/therapists/:slug/packages/:packageId/purchase', purchasePublicPackage);
router.get('/payments/:paymentId', getPublicPayment);
router.post('/payments/:paymentId/verify', verifyCheckout);
router.post('/payments/:paymentId/demo-confirm', confirmDemoPayment);
router.get('/payments/:paymentId/invoice', downloadPublicInvoice);
export default router;
