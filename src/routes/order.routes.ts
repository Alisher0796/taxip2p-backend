import express from 'express';
import {
  getAllOrders,
  getActiveOrders,
  getDriverActiveOrders,
  createOrder,
  updateOrder,
  completeOrder,
  createPriceOffer,
  acceptOffer,
  rejectOffer,
  startOrder,
  cancelOrder
} from '../controllers/order.controller';

import { authenticateTelegram } from '../middleware/auth';

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

// 💰 Сделать ценовое предложение
router.post('/:id/offer', authenticateTelegram, createPriceOffer);

// ✅ Принять ценовое предложение
router.post('/:id/offer/accept', authenticateTelegram, acceptOffer);

// ❌ Отклонить ценовое предложение
router.post('/:id/offer/reject', authenticateTelegram, rejectOffer);

// 🚗 Начать поездку
router.post('/:id/start', authenticateTelegram, startOrder);

// 🗑 Отменить заказ
router.post('/:id/cancel', authenticateTelegram, cancelOrder);

export default router;
