import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCart, addToCart, updateCartItem, removeCartItem } from '../controllers/cartController';

const router = Router();

router.use(requireAuth); // every route below requires a valid token

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);

export default router;