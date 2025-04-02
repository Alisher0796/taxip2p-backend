import { Server } from 'socket.io'
import { prisma } from '../server'

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`)

    socket.on('join', ({ orderId }) => {
      socket.join(orderId)
      console.log(`👥 Joined room for order ${orderId}`)
    })

    socket.on('chatMessage', async (data) => {
      const { orderId, senderId, text } = data

      // Проверка доступа
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      })

      if (!order || !order.driverId || order.status !== 'confirmed') {
        socket.emit('errorMessage', 'Чат недоступен — заказ не подтверждён')
        return
      }

      // Отправка сообщения в комнату
      io.to(orderId).emit('newMessage', { orderId, senderId, text })

      // Сохраняем в БД
      await prisma.message.create({
        data: { orderId, senderId, text },
      })
    })

    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`)
    })
  })
}
