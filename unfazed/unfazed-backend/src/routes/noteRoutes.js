import { Router } from 'express';
import { createNote, deleteNote, getNote, listTherapistNotes, updateNote } from '../controllers/noteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.route('/').get(listTherapistNotes).post(createNote);
router.route('/:noteId').get(getNote).patch(updateNote).delete(deleteNote);
export default router;
