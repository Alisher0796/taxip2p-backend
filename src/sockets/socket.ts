import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { OrderStatus, Role } from '@prisma/client';
import { AuthUser } from '../types/auth.types';

interface SocketUser {
  id: string;
  telegramId: string;
  role: Role;
}

interface ChatMessage {
  orderId: string;
  text: string;
}

export const setupSocket = (io: Server): void => {
  io.use(async (socket: Socket, next) => {
    try {
      const telegramId = socket.handshake.headers['x-telegram-id'] as string;
      if (!telegramId) {
        next(new Error('Authentication failed'));
        return;
      }

      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        next(new Error('User not found'));
        return;
      }

      socket.data.user = {
        id: user.id,
        telegramId: user.telegramId,
        role: user.role
      };

      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`🔗 User connected: ${user.telegramId} (${user.role || 'no role'})`);

    // Подписываемся на комнату заказа
    socket.on('joinOrder', (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`🔗 User ${user.telegramId} joined order ${orderId}`);
    });

    // Отписываемся от комнаты заказа
    socket.on('leaveOrder', (orderId: string) => {
      socket.leave(`order:${orderId}`);
      console.log(`🔗 User ${user.telegramId} left order ${orderId}`);
    });

    // Отправка сообщения в чат заказа
    socket.on('sendMessage', async (data: ChatMessage) => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId }
        });

        if (!order || order.status === OrderStatus.cancelled) {
          socket.emit('messageError', { error: 'Чат недоступен' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            text: data.text,
            orderId: data.orderId,
            senderId: user.id
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                telegramId: true
              }
            }
          }
        });

        io.to(`order:${data.orderId}`).emit('newMessage', {
          id: message.id,
          text: message.text,
          createdAt: message.createdAt,
          sender: message.sender
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', { error: 'Не удалось отправить сообщение' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔗 User disconnected: ${user.telegramId}`);
    });
  });
};
