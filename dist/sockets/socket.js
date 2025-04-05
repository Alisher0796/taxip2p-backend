"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const setupSocket = (io) => {
    io.use(async (socket, next) => {
        try {
            const telegramId = socket.handshake.headers['x-telegram-id'];
            if (!telegramId) {
                next(new Error('Authentication failed'));
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
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
        }
        catch (error) {
            console.error('Socket auth error:', error);
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        console.log(`🔗 User connected: ${user.telegramId} (${user.role || 'no role'})`);
        // Подписываемся на комнату заказа
        socket.on('joinOrder', (orderId) => {
            socket.join(`order:${orderId}`);
            console.log(`🔗 User ${user.telegramId} joined order ${orderId}`);
        });
        // Отписываемся от комнаты заказа
        socket.on('leaveOrder', (orderId) => {
            socket.leave(`order:${orderId}`);
            console.log(`🔗 User ${user.telegramId} left order ${orderId}`);
        });
        // Отправка сообщения в чат заказа
        socket.on('sendMessage', async (data) => {
            try {
                const order = await prisma_1.prisma.order.findUnique({
                    where: { id: data.orderId }
                });
                if (!order || order.status === client_1.OrderStatus.cancelled) {
                    socket.emit('messageError', { error: 'Чат недоступен' });
                    return;
                }
                const message = await prisma_1.prisma.message.create({
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
            }
            catch (error) {
                console.error('Error sending message:', error);
                socket.emit('messageError', { error: 'Не удалось отправить сообщение' });
            }
        });
        socket.on('disconnect', () => {
            console.log(`🔗 User disconnected: ${user.telegramId}`);
        });
    });
};
exports.setupSocket = setupSocket;
