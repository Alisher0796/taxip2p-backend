import { z } from 'zod';
import { OrderStatus, PickupTime } from '@prisma/client';

export const createOrderSchema = z.object({
  fromAddress: z.string().min(3).max(100),
  toAddress: z.string().min(3).max(100),
  pickupTime: z.nativeEnum(PickupTime).optional(),
  price: z.number().int().min(500).max(50000).optional(),
  comment: z.string().max(500).optional()
});

export const updateOrderSchema = z.object({
  fromAddress: z.string().min(3).max(100).optional(),
  toAddress: z.string().min(3).max(100).optional(),
  pickupTime: z.nativeEnum(PickupTime).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  price: z.number().int().min(500).max(50000).optional(),
  comment: z.string().max(500).optional()
});

export const createOfferSchema = z.object({
  price: z.number().int().min(500).max(50000)
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
