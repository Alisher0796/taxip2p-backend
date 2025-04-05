import { z } from 'zod';
import { OrderStatus, PickupTime, Role } from '@prisma/client';

// Валидация данных водителя
export const driverDataSchema = z.object({
  carModel: z.string().min(2, 'Марка авто должна быть не менее 2 символов'),
  carNumber: z.string().min(4, 'Госномер должен быть не менее 4 символов')
});

// Валидация создания заказа
export const createOrderSchema = z.object({
  fromAddress: z.string().min(5, 'Адрес отправления должен быть не менее 5 символов'),
  toAddress: z.string().min(5, 'Адрес назначения должен быть не менее 5 символов'),
  price: z.number().min(1, 'Цена должна быть больше 0').nullable().optional(),
  pickupTime: z.nativeEnum(PickupTime, {
    required_error: 'Выберите время подачи',
    invalid_type_error: 'Неверное значение времени подачи'
  }),
  comment: z.string().max(500, 'Комментарий не должен превышать 500 символов').optional()
});

// Валидация обновления заказа
export const updateOrderSchema = z.object({
  price: z.number().min(1, 'Цена должна быть больше 0').optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  comment: z.string().max(500, 'Комментарий не должен превышать 500 символов').optional()
});

// Валидация ценового предложения
export const createOfferSchema = z.object({
  price: z.number().min(1, 'Цена должна быть больше 0')
});

// Валидация принятия/отклонения предложения
export const offerActionSchema = z.object({
  offerId: z.string().uuid('Неверный формат ID предложения')
});

// Типы на основе схем валидации
export type DriverDataInput = z.infer<typeof driverDataSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type OfferActionInput = z.infer<typeof offerActionSchema>;
