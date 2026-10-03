import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { initiateStkPush, queryStkStatus } from '../services/mpesaService';
import { initiateStkPush } from '../services/mpesaService';


export const checkout = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMethod, deliveryAddress } = req.body;

    if (!paymentMethod || !deliveryAddress) {
      return res.status(400).json({ error: 'paymentMethod and deliveryAddress are required' });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock availability before committing to anything
    for (const item of cart.items) {
      if (!item.product.available || item.product.quantity < item.quantity) {
        return res.status(409).json({
          error: `Not enough stock for ${item.product.name}`,
        });
      }
    }

    const totalPrice = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    // Everything below must succeed together, or not at all
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: req.userId!,
          totalPrice,
          paymentMethod,
          deliveryAddress,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Decrement stock for each purchased product
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: -item.quantity,
            reason: 'SALE',
            orderId: newOrder.id,
          },
        });
      }

      // Empty the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete checkout' });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { items: { include: { product: true } } },
    });

    if (!order || order.userId !== req.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};




export const payOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { phone, cardNumber, cardExpiry, cardCvv } = req.body || {};

    const order = await prisma.order.findUnique({ where: { id: Number(id) } });
    if (!order || order.userId !== req.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Order is already ${order.status.toLowerCase()}` });
    }

    const updateData: { paymentPhone?: string; paymentCardLast4?: string } = {};

    if (order.paymentMethod === 'M-Pesa') {
      if (!phone || !/^(?:\+254|0)7\d{8}$/.test(phone)) {
        return res.status(400).json({ error: 'A valid M-Pesa phone number is required (e.g. 0712345678)' });
      }
      updateData.paymentPhone = phone;
    }

    if (order.paymentMethod === 'Debit/Credit Card') {
      const digits = (cardNumber || '').replace(/\s/g, '');
      if (!digits || !/^\d{13,19}$/.test(digits)) {
        return res.status(400).json({ error: 'A valid card number is required' });
      }
      if (!cardExpiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
        return res.status(400).json({ error: 'Card expiry must be in MM/YY format' });
      }
      if (!cardCvv || !/^\d{3,4}$/.test(cardCvv)) {
        return res.status(400).json({ error: 'A valid CVV is required' });
      }
      // Only the last 4 digits are ever persisted — the full number, expiry, and CVV are discarded after validation
      updateData.paymentCardLast4 = digits.slice(-4);
    }

    // Simulated payment processing delay — stands in for a real gateway's response time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const updated = await prisma.order.update({
      where: { id: Number(id) },
      data: { status: 'CONFIRMED', ...updateData },
      include: { items: { include: { product: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: { items: { include: { product: true } }, user: { select: { id: true, name: true, email: true } } },
    });

    res.json(order);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

export const getSalesStats = async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause: any = {
      status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
    };
    if (req.query.days !== 'all') {
      whereClause.createdAt = { gte: startDate };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const orderCount = orders.length;

    // Revenue grouped by calendar day, for the chart
    const revenueByDayMap: Record<string, number> = {};
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10); // "2026-10-01"
      revenueByDayMap[day] = (revenueByDayMap[day] || 0) + Number(order.totalPrice);
    }
    const revenueByDay = Object.entries(revenueByDayMap).map(([date, revenue]) => ({ date, revenue }));

    // Top products by revenue, aggregated across every order item
    const productStats: Record<number, { name: string; quantity: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!productStats[key]) {
          productStats[key] = { name: item.product.name, quantity: 0, revenue: 0 };
        }
        productStats[key].quantity += item.quantity;
        productStats[key].revenue += Number(item.price) * item.quantity;
      }
    }
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      totalRevenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      revenueByDay,
      topProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales stats' });
  }
};

export const getSalesDetails = async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? String(req.query.days) : '30';
    const whereClause: any = {
      status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
    };
    if (days !== 'all') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      whereClause.createdAt = { gte: startDate };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Flatten: one row per order item, carrying its parent order's payment context
    const details = orders.flatMap((order) =>
      order.items.map((item) => ({
        id: `${order.id}-${item.id}`,
        orderId: order.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.price,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        accountSuffix:
          order.paymentMethod === 'M-Pesa'
            ? order.paymentPhone?.slice(-4) ?? null
            : order.paymentMethod === 'Debit/Credit Card'
            ? order.paymentCardLast4 ?? null
            : null,
      }))
    );

    res.json(details);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales details' });
  }
};

export const initiateMpesaPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!phone || !/^(?:\+254|0|254)7\d{8}$/.test(phone)) {
      return res.status(400).json({ error: 'A valid M-Pesa phone number is required' });
    }

    const order = await prisma.order.findUnique({ where: { id: Number(id) } });
    if (!order || order.userId !== req.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Order is already ${order.status.toLowerCase()}` });
    }

    // Daraja requires the phone in 2547XXXXXXXX format, not 07XX or +254
    const normalizedPhone = phone.replace(/^0/, '254').replace(/^\+/, '');

    const result = await initiateStkPush({
      phone: normalizedPhone,
      amount: Number(order.totalPrice),
      accountReference: `Order${order.id}`,
      transactionDesc: `Payment for order #${order.id}`,
    });

    await prisma.order.update({
      where: { id: Number(id) },
      data: {
        mpesaCheckoutRequestId: result.CheckoutRequestID,
        mpesaMerchantRequestId: result.MerchantRequestID,
        paymentPhone: normalizedPhone,
      },
    });

    res.json({ message: 'STK push sent — check your phone', checkoutRequestId: result.CheckoutRequestID });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to initiate payment' });
  }
};


export const checkMpesaStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id: Number(id) } });
    if (!order || order.userId !== req.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PENDING' || !order.mpesaCheckoutRequestId) {
      return res.json({ status: order.status }); // already resolved — nothing to query
    }

    const result = await queryStkStatus(order.mpesaCheckoutRequestId);

    if (result.ResultCode === '0' || result.ResultCode === 0) {
      const updated = await prisma.order.update({
        where: { id: Number(id) },
        data: { status: 'CONFIRMED' },
      });
      return res.json({ status: updated.status });
    }

    if (result.ResultCode === undefined) {
      // Still being processed — customer hasn't responded on their phone yet
      return res.json({ status: 'PENDING', stillWaiting: true });
    }

    // A definitive failure code (cancelled, timeout, insufficient funds, etc.)
    return res.json({ status: 'PENDING', failed: true, reason: result.ResultDesc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
};