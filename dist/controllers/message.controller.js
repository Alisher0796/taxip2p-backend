"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = exports.getMessagesByOrder = void 0;
const prisma_1 = require("../lib/prisma");
const message_validator_1 = require("../validators/message.validator");
const getMessagesByOrder = async (req, res) => {
    const { orderId } = req.params;
    try {
        const messages = await prisma_1.prisma.message.findMany({
            where: { orderId },
            include: { sender: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(messages);
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
