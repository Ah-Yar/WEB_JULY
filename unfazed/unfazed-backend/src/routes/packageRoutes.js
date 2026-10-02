import { Router } from 'express';
import { createPackage, listPackages, updatePackage } from '../controllers/packageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.route('/').get(listPackages).post(createPackage);
router.patch('/:packageId', updatePackage);
export default router;
