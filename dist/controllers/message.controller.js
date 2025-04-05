"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.createMessage = exports.getMessagesByOrder = void 0;
const prisma_1 = require("../lib/prisma");
const message_validator_1 = require("../validators/message.validator");
const server_1 = require("../server");
const getMessagesByOrder = async (req, res) => {
    const { orderId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const [messages, total] = await Promise.all([
            prisma_1.prisma.message.findMany({
                where: { orderId },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.message.count({
                where: { orderId }
            })
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            messages: messages.reverse(), // Возвращаем в хронологическом порядке
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    }
    catch (error) {
        console.error('Failed to fetch messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};
exports.getMessagesByOrder = getMessagesByOrder;
const createMessage = async (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const result = message_validator_1.createMessageSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error.errors });
        return;
    }
    const { orderId, text } = result.data;
    const senderId = user.id;
    try {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        if (order.passengerId !== senderId && order.driverId !== senderId) {
            res.status(403).json({ error: 'You are not a participant of this order' });
            return;
        }
        const message = await prisma_1.prisma.message.create({
            data: {
                orderId,
                senderId,
                text,
            }
        });
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};
exports.createMessage = createMessage;
// 🗑 Удалить сообщение
const deleteMessage = async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const message = await prisma_1.prisma.message.findUnique({
            where: { id },
            include: {
                order: true
            }
        });
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        // Проверяем права на удаление
        if (message.senderId !== user.id && message.order.passengerId !== user.id && message.order.driverId !== user.id) {
            res.status(403).json({ error: 'Not authorized to delete this message' });
            return;
        }
        // Удаляем сообщение
        await prisma_1.prisma.message.delete({
            where: { id }
        });
        // Уведомляем всех участников чата
        server_1.io.to(`order_${message.orderId}`).emit('messageDeleted', {
            messageId: id,
            deletedBy: {
                id: user.id,
                role: user.role
            }
        });
        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    }
    catch (error) {
        console.error('Failed to delete message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
};
exports.deleteMessage = deleteMessage;
