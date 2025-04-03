import express from 'express';
import {
  getAllOrders,
  getActiveOrders,
  getDriverActiveOrders,
  createOrder,
  updateOrder,
  completeOrder,
  acceptOrder
} from '../controllers/order.controller';

import { authenticateTelegram } from '../middleware/auth.middleware';

const router = express.Router();

// 🔐 Получить все заказы текущего пользователя
router.get('/', authenticateTelegram, getAllOrders);

// 🔍 Получить активные заказы пассажира
router.get('/active', authenticateTelegram, getActiveOrders);

// 🚗 Получить активные заказы водителя
router.get('/driver-active', authenticateTelegram, getDriverActiveOrders);

// 📝 Создать новый заказ
router.post('/', authenticateTelegram, createOrder);

// 🔄 Обновить заказ по ID
router.put('/:id', authenticateTelegram, updateOrder);

// ✅ Завершить заказ
router.put('/:id/complete', authenticateTelegram, completeOrder);

// ✅ Принять заказ (водителем)
router.post('/:id/accept', authenticateTelegram, acceptOrder);

export default router;
