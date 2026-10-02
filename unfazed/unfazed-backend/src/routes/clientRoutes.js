import { Router } from 'express';
import { createClient, createClientPortalLink, getClient, listClients, updateClient } from '../controllers/clientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.route('/').get(listClients).post(createClient);
router.route('/:clientId').get(getClient).patch(updateClient);
router.post('/:clientId/portal-link', createClientPortalLink);
export default router;
