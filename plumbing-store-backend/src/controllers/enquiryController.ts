import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';

const userSelect = { id: true, name: true, email: true };

// Customer: start a new enquiry (creates the enquiry + its first message together)
export const createEnquiry = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity, message, phone } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        userId: req.userId!,
        productId: productId ?? null,
        quantity: quantity ?? null,
        phone: phone ?? null,
        messages: {
          create: {
            senderRole: 'CUSTOMER',
            text: message,
          },
        },
      },
      include: {
        product: true,
        user: { select: userSelect },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.status(201).json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
};

// Customer: list own enquiries (preview only, keeps this endpoint light)
export const getMyEnquiries = async (req: AuthRequest, res: Response) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      where: { userId: req.userId! },
      include: {
        product: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// Admin: list all enquiries (preview only, same shape as above)
export const getAllEnquiries = async (req: AuthRequest, res: Response) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: {
        product: true,
        user: { select: userSelect },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// Either party: get one enquiry's full thread
export const getEnquiryById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: Number(id) },
      include: {
        product: true,
        user: { select: userSelect },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    if (req.userRole !== 'ADMIN' && enquiry.userId !== req.userId) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    res.json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enquiry' });
  }
};

// Either party: post a new message into the thread
export const addMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const enquiry = await prisma.enquiry.findUnique({ where: { id: Number(id) } });
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    if (req.userRole !== 'ADMIN' && enquiry.userId !== req.userId) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const senderRole = req.userRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';

    const message = await prisma.enquiryMessage.create({
      data: { enquiryId: Number(id), senderRole, text },
    });

    if (senderRole === 'ADMIN' && enquiry.status === 'PENDING') {
      await prisma.enquiry.update({
        where: { id: Number(id) },
        data: { status: 'REPLIED' },
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Admin: convert an enquiry into a custom-priced order
export const convertEnquiryToOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items, paymentMethod, deliveryAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    if (!paymentMethod || !deliveryAddress) {
      return res.status(400).json({ error: 'paymentMethod and deliveryAddress are required' });
    }

    const enquiry = await prisma.enquiry.findUnique({ where: { id: Number(id) } });
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    // Verify stock for every item before committing to anything
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(409).json({
          error: `Not enough stock for ${product.name} (have ${product.quantity}, need ${item.quantity})`,
        });
      }
    }

    const totalPrice = items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0
    );

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: enquiry.userId,
          totalPrice,
          paymentMethod,
          deliveryAddress,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      for (const item of items) {
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

      await tx.enquiry.update({
        where: { id: Number(id) },
        data: { status: 'CLOSED' },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert enquiry to order' });
  }
};