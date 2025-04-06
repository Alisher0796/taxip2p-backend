import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { prisma } from './prisma';
import { OrderStatus, Role } from '@prisma/client';
import { verifyTelegramWebAppData } from './telegram';

let io: Server;

// Кэш пользователей
const userCache = new Map<string, { user: SocketUser; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Ограничения для сообщений
const MESSAGE_LIMITS = {
  MAX_LENGTH: 1000, // Максимальная длина сообщения
  RATE_LIMIT: 1000, // Минимальный интервал между сообщениями (мс)
};

interface SocketUser {
  id: string;
  telegramId: string;
  role: Role;
  lastMessageTime?: number;
}

interface ChatMessage {
  orderId: string;
  text: string;
}

export function initializeSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket']
  });

  // Мидлвар для аутентификации
  io.use(async (socket: Socket, next) => {
    try {
      // 1. Проверяем данные Telegram
      const initData = socket.handshake.headers['x-telegram-init-data'] as string;
      if (!initData) {
        return next(new Error('Missing Telegram init data'));
      }

      const telegramData = await verifyTelegramWebAppData(initData);
      if (!telegramData?.user) {
        return next(new Error('Invalid Telegram data'));
      }

      const telegramId = telegramData.user.id.toString();

      // 2. Проверяем кэш
      const cached = userCache.get(telegramId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        socket.data.user = cached.user;
        return next();
      }

      // 3. Ищем пользователя в БД
      const user = await prisma.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      // 4. Обновляем кэш
      const socketUser: SocketUser = {
        id: user.id,
        telegramId: user.telegramId,
        role: user.role
      };

      userCache.set(telegramId, {
        user: socketUser,
        timestamp: Date.now()
      });

      socket.data.user = socketUser;
      next();
    } catch (error) {
      console.error('[Socket] Auth error:', error instanceof Error ? error.message : 'Unknown error');
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;

    // Подписка на заказ
    socket.on('joinOrder', async (orderId: string) => {
      try {
        // Проверяем права доступа к заказу
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { passengerId: true, driverId: true }
        });

        if (!order || (order.passengerId !== user.id && order.driverId !== user.id)) {
          socket.emit('error', { message: 'Нет доступа к заказу' });
          return;
        }

        socket.join(`order:${orderId}`);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка подключения к чату' });
      }
    });

    // Отправка сообщения
    socket.on('sendMessage', async (data: ChatMessage) => {
      try {
        // 1. Проверяем ограничения
        if (data.text.length > MESSAGE_LIMITS.MAX_LENGTH) {
          socket.emit('messageError', { error: 'Сообщение слишком длинное' });
          return;
        }

        const now = Date.now();
        if (user.lastMessageTime && now - user.lastMessageTime < MESSAGE_LIMITS.RATE_LIMIT) {
          socket.emit('messageError', { error: 'Слишком частые сообщения' });
          return;
        }

        // 2. Проверяем доступ к заказу
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          select: { status: true, passengerId: true, driverId: true }
        });

        if (!order || order.status === OrderStatus.cancelled) {
          socket.emit('messageError', { error: 'Чат недоступен' });
          return;
        }

        if (order.passengerId !== user.id && order.driverId !== user.id) {
          socket.emit('messageError', { error: 'Нет доступа к чату' });
          return;
        }

        // 3. Создаём и отправляем сообщение
        const message = await prisma.message.create({
          data: {
            text: data.text.trim(),
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

        user.lastMessageTime = now;

        io.to(`order:${data.orderId}`).emit('newMessage', {
          id: message.id,
          text: message.text,
          createdAt: message.createdAt,
          sender: message.sender
        });
      } catch (error) {
        console.error('[Socket] Message error:', error instanceof Error ? error.message : 'Unknown error');
        socket.emit('messageError', { error: 'Не удалось отправить сообщение' });
      }
    });

    socket.on('disconnect', () => {
      // Очищаем кэш при отключении
      userCache.delete(user.telegramId);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}
