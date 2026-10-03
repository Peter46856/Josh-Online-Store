import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const mpesaCallback = async (req: Request, res: Response) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback payload' });
    }

    const { CheckoutRequestID, ResultCode } = callback;

    const order = await prisma.order.findFirst({
      where: { mpesaCheckoutRequestId: CheckoutRequestID },
    });

    if (!order) {
      console.error('No matching order for CheckoutRequestID:', CheckoutRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (ResultCode === 0) {
      // Payment succeeded
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' },
      });
    } else {
      // Customer cancelled, timed out, or had insufficient funds — ResultCode tells us which,
      // but for now we just log it and leave the order PENDING so they can retry
      console.log(`M-Pesa payment failed for order ${order.id}: ${callback.ResultDesc}`);
    }

    // Always acknowledge receipt, regardless of outcome — Safaricom retries if you don't
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error(error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
};