"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const telegram_1 = require("../lib/telegram");
// Кэш пользователей
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
// Ограничения для сообщений
const MESSAGE_LIMITS = {
    MAX_LENGTH: 1000, // Максимальная длина сообщения
    RATE_LIMIT: 1000, // Минимальный интервал между сообщениями (мс)
};
const setupSocket = (io) => {
    // Мидлвар для аутентификации
    io.use(async (socket, next) => {
        try {
            // 1. Проверяем данные Telegram
            const initData = socket.handshake.headers['x-telegram-init-data'];
            if (!initData) {
                return next(new Error('Missing Telegram init data'));
            }
            const telegramData = await (0, telegram_1.verifyTelegramWebAppData)(initData);
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
            const user = await prisma_1.prisma.user.findUnique({
                where: { telegramId }
            });
            if (!user) {
                return next(new Error('User not found'));
            }
            // 4. Обновляем кэш
            const socketUser = {
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
        }
        catch (error) {
            console.error('[Socket] Auth error:', error instanceof Error ? error.message : 'Unknown error');
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        // Подписка на заказ
        socket.on('joinOrder', async (orderId) => {
            try {
                // Проверяем права доступа к заказу
                const order = await prisma_1.prisma.order.findUnique({
                    where: { id: orderId },
                    select: { passengerId: true, driverId: true }
                });
                if (!order || (order.passengerId !== user.id && order.driverId !== user.id)) {
                    socket.emit('error', { message: 'Нет доступа к заказу' });
                    return;
                }
                socket.join(`order:${orderId}`);
            }
            catch (error) {
                socket.emit('error', { message: 'Ошибка подключения к чату' });
            }
        });
        // Отправка сообщения
        socket.on('sendMessage', async (data) => {
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
                const order = await prisma_1.prisma.order.findUnique({
                    where: { id: data.orderId },
                    select: { status: true, passengerId: true, driverId: true }
                });
                if (!order || order.status === client_1.OrderStatus.cancelled) {
                    socket.emit('messageError', { error: 'Чат недоступен' });
                    return;
                }
                if (order.passengerId !== user.id && order.driverId !== user.id) {
                    socket.emit('messageError', { error: 'Нет доступа к чату' });
                    return;
                }
                // 3. Создаём и отправляем сообщение
                const message = await prisma_1.prisma.message.create({
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
            }
            catch (error) {
                console.error('[Socket] Message error:', error instanceof Error ? error.message : 'Unknown error');
                socket.emit('messageError', { error: 'Не удалось отправить сообщение' });
            }
        });
        socket.on('disconnect', () => {
            // Очищаем кэш при отключении
            userCache.delete(user.telegramId);
        });
    });
};
exports.setupSocket = setupSocket;
