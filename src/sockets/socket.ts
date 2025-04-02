import { Server } from 'socket.io'
import { prisma } from '../lib/prisma'

export function setupSocket(io: Server) {
  io.use(async (socket, next) => {
    const telegramId = socket.handshake.headers['x-telegram-id'] as string

    if (!telegramId) {
      return next(new Error('No Telegram ID'))
    }

    const user = await prisma.user.findUnique({ where: { telegramId } })

    if (!user) {
      return next(new Error('User not found'))
    }

    socket.data.user = {
      id: user.id,
      role: user.role,
    }

    next()
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log(`🟢 Socket connected: ${socket.id} | User: ${user?.id}`)

    socket.on('join', ({ orderId }) => {
      socket.join(orderId)
      console.log(`👥 User ${user?.id} joined room for order ${orderId}`)
    })

    socket.on('chatMessage', async (data) => {
      const { orderId, text } = data
      const senderId = user?.id

      if (!orderId || !text || !senderId) {
        socket.emit('errorMessage', 'Invalid chat message data')
        return
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      })

      if (!order || order.status !== 'confirmed') {
        socket.emit('errorMessage', 'Чат недоступен — заказ не подтверждён')
        return
      }

      // Сохраняем в БД
      const message = await prisma.message.create({
        data: { orderId, senderId, text },
      })

      // Отправка сообщения в комнату
      io.to(orderId).emit('newMessage', message)
    })

    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`)
    })
  })
}
