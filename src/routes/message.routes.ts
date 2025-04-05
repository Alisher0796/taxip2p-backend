import express from 'express'
import { getMessagesByOrder, createMessage, deleteMessage } from '../controllers/message.controller'
import { authenticateTelegram } from '../middleware/auth'

const router = express.Router()

router.get('/:orderId', getMessagesByOrder)
router.post('/', authenticateTelegram, createMessage)
router.delete('/:id', authenticateTelegram, deleteMessage)

export default router
