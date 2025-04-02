import express from 'express';
import {
  getAllOrders,
  createOrder,
  updateOrder,
  completeOrder
} from '../controllers/order.controller';
import { authenticateTelegram } from '../middleware/auth.middleware';

const router = express.Router();

// 🔐 Получить все заказы текущего пользователя
router.get('/', authenticateTelegram, getAllOrders);

// 📝 Создать новый заказ
router.post('/', authenticateTelegram, createOrder);

// 🔄 Обновить заказ по ID
router.put('/:id', authenticateTelegram, updateOrder);

// ✅ Завершить заказ
router.put('/:id/complete', authenticateTelegram, completeOrder);

export default router;
