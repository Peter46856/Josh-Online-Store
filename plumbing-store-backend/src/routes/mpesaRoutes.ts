import { Router } from 'express';
import { mpesaCallback } from '../controllers/mpesaController';

const router = Router();

// No auth — Safaricom calls this directly, not a logged-in user
router.post('/callback', mpesaCallback);

export default router;