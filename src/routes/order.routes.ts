import express from 'express'
import {
  getAllOrders,
  createOrder,
  updateOrder,
  completeOrder
} from '../controllers/order.controller'
import { authenticateTelegram } from '../middleware/auth.middleware'

const router = express.Router()

// 🔐 Все действия требуют авторизации по Telegram ID
router.get('/', authenticateTelegram, getAllOrders)
router.post('/', authenticateTelegram, createOrder)
router.put('/:id', authenticateTelegram, updateOrder)
router.put('/:id/complete', authenticateTelegram, completeOrder)

export default router
