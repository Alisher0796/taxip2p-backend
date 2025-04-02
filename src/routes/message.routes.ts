import express from 'express'
import { getMessagesByOrder, createMessage } from '../controllers/message.controller'

const router = express.Router()

router.get('/:orderId', getMessagesByOrder)
router.post('/', createMessage)

export default router
