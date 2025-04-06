import { z } from 'zod';
import { OrderStatus, PickupTime } from '@prisma/client';

export const createOrderSchema = z.object({
  body: z.object({
    fromAddress: z.string().min(1, 'From address is required'),
    toAddress: z.string().min(1, 'To address is required'),
    price: z.number().positive('Price must be a positive number').optional(),
    comment: z.string().max(500, 'Comment must be less than 500 characters').optional(),
    pickupTime: z.nativeEnum(PickupTime).default('MINS_15')
  })
});

export const updateOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID')
  }),
  body: z.object({
    fromAddress: z.string().min(1).optional(),
    toAddress: z.string().min(1).optional(),
    price: z.number().positive('Price must be a positive number').optional(),
    comment: z.string().max(500, 'Comment must be less than 500 characters').optional(),
    pickupTime: z.nativeEnum(PickupTime).optional()
  })
});

export const createPriceOfferSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID')
  }),
  body: z.object({
    price: z.number().positive('Price must be a positive number'),
    comment: z.string().max(500, 'Comment must be less than 500 characters').optional(),
    expiresAt: z.string().datetime('Invalid expiration date').optional()
  })
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID')
  }),
  body: z.object({
    status: z.nativeEnum(OrderStatus, {
      errorMap: () => ({ message: 'Invalid order status' })
    })
  })
});

export const orderIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID')
  })
});

export const acceptOfferSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID')
  }),
  body: z.object({
    offerId: z.string().uuid('Invalid offer ID')
  })
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>['body'];
export type CreatePriceOfferInput = z.infer<typeof createPriceOfferSchema>['body'];
