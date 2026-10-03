import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  checkout,
  getMyOrders,
  getOrderById,
  payOrder,
  getAllOrders,
  updateOrderStatus,
  getSalesStats,
  getSalesDetails,
  initiateMpesaPayment,
} from '../controllers/orderController';
import { checkMpesaStatus } from '../controllers/orderController';


const router = Router();

router.use(requireAuth);

router.post('/checkout', checkout);
router.get('/', getMyOrders);
router.get('/admin/all', requireAdmin, getAllOrders);
router.get('/admin/stats', requireAdmin, getSalesStats);
router.get('/admin/sales', requireAdmin, getSalesDetails);
router.get('/:id', getOrderById);
router.post('/:id/pay', payOrder);
router.post('/:id/mpesa/initiate', initiateMpesaPayment);
router.put('/:id/status', requireAdmin, updateOrderStatus);
router.get('/:id/mpesa/status', checkMpesaStatus);

export default router;