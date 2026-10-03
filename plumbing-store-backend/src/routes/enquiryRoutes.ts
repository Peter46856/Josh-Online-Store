import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  createEnquiry,
  getMyEnquiries,
  getAllEnquiries,
  getEnquiryById,
  addMessage,
  convertEnquiryToOrder,
} from '../controllers/enquiryController';

const router = Router();

router.use(requireAuth);

router.post('/', createEnquiry);
router.get('/my', getMyEnquiries);
router.get('/:id', getEnquiryById);
router.post('/:id/messages', addMessage);

router.get('/', requireAdmin, getAllEnquiries);
router.post('/:id/convert', requireAdmin, convertEnquiryToOrder);

export default router;