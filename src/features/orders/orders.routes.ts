import { Router } from 'express';
import { validateRequest } from '@middleware/validateRequest';
import { authenticateTelegram } from '@middleware/auth.middleware';
import { OrderController } from './orders.controller';
import { OrderService } from './orders.service';
import { prisma } from '@lib/prisma';
import { redis } from '@lib/redis';
// io будет доступен через req.app.locals.io
import {
  createOrderSchema,
  updateOrderSchema,
  createPriceOfferSchema,
  orderIdParamSchema,
  acceptOfferSchema,
  updateOrderStatusSchema
} from './orders.schema';

function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticateTelegram);

  // Order management routes
  router.post(
    '/',
    validateRequest({ body: createOrderSchema }),
    controller.createOrder
  );

  router.put(
    '/:id',
    validateRequest({ params: orderIdParamSchema, body: updateOrderSchema }),
    controller.updateOrder
  );

  router.post(
    '/:orderId/offers',
    validateRequest({ params: orderIdParamSchema, body: createPriceOfferSchema }),
    controller.createPriceOffer
  );

  router.post(
    '/:id/accept-offer',
    validateRequest({ params: orderIdParamSchema, body: acceptOfferSchema }),
    controller.acceptOffer
  );

  router.patch(
    '/:id/status',
    validateRequest({ body: updateOrderStatusSchema }),
    controller.updateOrderStatus
  );

  // Query routes
  router.get(
    '/active',
    controller.getActiveOrders
  );

  router.get(
    '/:id',
    validateRequest({ params: orderIdParamSchema }),
    controller.getOrderById
  );

  return router;
}

// Создаем и экспортируем роутер
const router = Router();

// Инициализируем сервисы
const orderService = new OrderService(prisma, redis);
const orderController = new OrderController(orderService);

// Подключаем маршруты
router.use(createOrderRoutes(orderController));

export default router;
