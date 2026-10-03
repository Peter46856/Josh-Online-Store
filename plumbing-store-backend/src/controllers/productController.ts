import { Request, Response } from 'express';
import prisma from '../prisma/client';
import supabase from '../lib/supabaseStorage';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, quantity, categoryId, imageUrl } = req.body;

    if (!name || price === undefined || !categoryId) {
      return res.status(400).json({ error: 'name, price, and categoryId are required' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        quantity: quantity ?? 0,
        categoryId,
        imageUrl,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};


export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};




export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, categoryId, imageUrl, available, lowStockThreshold } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: Number(id) },
        data: { name, description, price, quantity, categoryId, imageUrl, available, lowStockThreshold },
      });

      // If quantity actually changed via this edit, log it as a manual adjustment
      if (quantity !== undefined && quantity !== existing.quantity) {
        await tx.stockMovement.create({
          data: {
            productId: Number(id),
            change: quantity - existing.quantity,
            reason: 'ADJUSTMENT',
          },
        });
      }

      return updated;
    });

    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const getProductMovements = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const movements = await prisma.stockMovement.findMany({
      where: { productId: Number(id) },
      include: { order: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(movements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};

export const restockProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'A positive amount is required' });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: Number(id) },
        data: { quantity: { increment: amount } },
      });

      await tx.stockMovement.create({
        data: {
          productId: Number(id),
          change: amount,
          reason: 'RESTOCK',
          note: note || null,
        },
      });

      return updated;
    });

    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to restock product' });
  }
};


export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const ext = file.originalname.split('.').pop();
    const path = `products/${id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);

    const image = await prisma.productImage.create({
      data: { productId: Number(id), url: urlData.publicUrl, path },
    });

    // Keep the legacy single imageUrl field pointing at a real photo for pages that still use it,
    // but only set it if the product doesn't have one yet — later uploads don't override the display photo
    if (!product.imageUrl) {
      await prisma.product.update({
        where: { id: Number(id) },
        data: { imageUrl: urlData.publicUrl },
      });
    }

    res.status(201).json(image);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const getProductImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const images = await prisma.productImage.findMany({
      where: { productId: Number(id) },
      orderBy: { createdAt: 'asc' },
    });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
};

export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.productImage.findUnique({ where: { id: Number(imageId) } });
    if (!image || image.productId !== Number(id)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove([image.path]);

    if (storageError) {
      console.error(storageError);
      // Continue anyway — don't let a storage cleanup failure block removing the database record
    }

    await prisma.productImage.delete({ where: { id: Number(imageId) } });

    // If we just deleted the photo currently used as the product's main display image,
    // fall back to another remaining image, or clear it if none are left
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (product?.imageUrl === image.url) {
      const remaining = await prisma.productImage.findFirst({
        where: { productId: Number(id) },
        orderBy: { createdAt: 'asc' },
      });
      await prisma.product.update({
        where: { id: Number(id) },
        data: { imageUrl: remaining?.url ?? null },
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};