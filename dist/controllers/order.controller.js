"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.startOrder = exports.rejectOffer = exports.acceptOffer = exports.createPriceOffer = exports.completeOrder = exports.updateOrder = exports.createOrder = exports.getDriverActiveOrders = exports.getActiveOrders = exports.getAllOrders = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const order_validator_1 = require("../validators/order.validator");
const server_1 = require("../server");
// 🔹 Получить все заказы пользователя (пассажир или водитель)
const getAllOrders = async (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: {
                OR: [
                    { passengerId: user.id },
                    { driverId: user.id }
                ]
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                offers: {
                    include: {
                        driver: {
                            select: {
                                id: true,
                                username: true,
                                carModel: true,
                                carNumber: true
                            }
                        }
                    }
                },
                _count: {
                    select: { messages: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                messageCount: order._count.messages
            }))
        });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Could not fetch orders' });
    }
};
exports.getAllOrders = getAllOrders;
// 🔹 Получить активные заказы для текущей роли пользователя
const getActiveOrders = async (req, res) => {
    const user = req.user;
    if (!user || !user.role) {
        res.status(401).json({ error: 'Unauthorized or role not set' });
        return;
    }
    try {
        const where = user.role === client_1.Role.passenger
            ? {
                passengerId: user.id,
                status: { in: [client_1.OrderStatus.pending, client_1.OrderStatus.negotiating] }
            }
            : {
                status: client_1.OrderStatus.pending,
                NOT: { passengerId: user.id }
            };
        const orders = await prisma_1.prisma.order.findMany({
            where,
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                offers: {
                    where: user.role === client_1.Role.driver ? { driverId: user.id } : {},
                    select: {
                        id: true,
                        price: true,
                        status: true,
                        driver: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                hasOffer: order.offers.length > 0
            }))
        });
    }
    catch (error) {
        console.error('Error fetching active orders:', error);
        res.status(500).json({ error: 'Could not fetch active orders' });
    }
};
exports.getActiveOrders = getActiveOrders;
// 🔹 Получить активные заказы водителя
const getDriverActiveOrders = async (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: {
                driverId: user.id,
                status: client_1.OrderStatus.accepted
            },
            include: {
                passenger: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(orders);
    }
    catch (error) {
        console.error('Error fetching driver orders:', error);
        res.status(500).json({ error: 'Could not fetch driver orders' });
    }
};
exports.getDriverActiveOrders = getDriverActiveOrders;
// 🔹 Создать заказ
const createOrder = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== client_1.Role.passenger) {
        res.status(401).json({ error: 'Unauthorized or invalid role' });
        return;
    }
    const result = order_validator_1.createOrderSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            issues: result.error.issues
        });
        return;
    }
    try {
        const validatedData = result.data;
        const order = await prisma_1.prisma.order.create({
            data: {
                fromAddress: validatedData.fromAddress,
                toAddress: validatedData.toAddress,
                price: validatedData.price || null,
                pickupTime: validatedData.pickupTime,
                comment: validatedData.comment,
                status: client_1.OrderStatus.pending,
                passengerId: user.id
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                offers: {
                    include: {
                        driver: {
                            select: {
                                id: true,
                                username: true,
                                carModel: true,
                                carNumber: true
                            }
                        }
                    }
                }
            }
        });
        // Уведомляем всех водителей о новом заказе
        const notificationData = {
            orderId: order.id,
            fromAddress: order.fromAddress,
            toAddress: order.toAddress,
            price: order.price,
            pickupTime: order.pickupTime,
            comment: order.comment,
            passenger: order.passenger
        };
        server_1.io.emit('newOrder', notificationData);
        res.json({
            success: true,
            order
        });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Could not create order'
        });
    }
};
exports.createOrder = createOrder;
// 🔹 Обновить заказ
const updateOrder = async (req, res) => {
    const user = req.user;
    const id = req.params.id;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    // Проверяем существование заказа
    const existingOrder = await prisma_1.prisma.order.findUnique({
        where: { id },
        include: {
            offers: true
        }
    });
    if (!existingOrder) {
        res.status(404).json({ error: 'Order not found' });
        return;
    }
    // Проверяем права на обновление
    if (existingOrder.passengerId !== user.id) {
        res.status(403).json({ error: 'Not authorized to update this order' });
        return;
    }
    // Проверяем возможность обновления
    if (existingOrder.offers.length > 0) {
        res.status(400).json({ error: 'Cannot update order with existing offers' });
        return;
    }
    const result = order_validator_1.updateOrderSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            issues: result.error.issues
        });
        return;
    }
    const { price, comment } = result.data;
    try {
        const updated = await prisma_1.prisma.order.update({
            where: { id },
            data: {
                ...(price && { price }),
                ...(comment && { comment })
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true,
                        carModel: true,
                        carNumber: true
                    }
                },
                offers: {
                    include: {
                        driver: {
                            select: {
                                id: true,
                                username: true,
                                carModel: true,
                                carNumber: true
                            }
                        }
                    }
                }
            }
        });
        // Уведомляем всех водителей об обновлении заказа
        server_1.io.emit('orderUpdated', {
            orderId: updated.id,
            price: updated.price,
            comment: updated.comment
        });
        res.json({
            success: true,
            order: updated
        });
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Could not update order'
        });
    }
};
exports.updateOrder = updateOrder;
// 🔹 Завершить заказ
const completeOrder = async (req, res) => {
    const user = req.user;
    const id = req.params.id;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    // Проверяем существование заказа
    const existingOrder = await prisma_1.prisma.order.findUnique({
        where: { id }
    });
    if (!existingOrder) {
        res.status(404).json({ error: 'Order not found' });
        return;
    }
    // Только водитель может завершить заказ
    if (existingOrder.driverId !== user.id) {
        res.status(403).json({ error: 'Only the driver can complete the order' });
        return;
    }
    // Проверяем статус заказа
    if (existingOrder.status !== client_1.OrderStatus.inProgress) {
        res.status(400).json({ error: 'Only in-progress orders can be completed' });
        return;
    }
    try {
        const completed = await prisma_1.prisma.order.update({
            where: { id },
            data: {
                status: client_1.OrderStatus.completed,
                completedAt: new Date()
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true,
                        carModel: true,
                        carNumber: true
                    }
                }
            }
        });
        // Уведомляем пассажира о завершении поездки
        server_1.io.to(`order_${completed.id}`).emit('orderCompleted', {
            orderId: completed.id,
            completedAt: completed.completedAt
        });
        res.json({
            success: true,
            order: completed
        });
    }
    catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({
            success: false,
            error: 'Could not complete order'
        });
    }
};
exports.completeOrder = completeOrder;
// 🔹 Сделать ценовое предложение
const createPriceOffer = async (req, res) => {
    const user = req.user;
    const orderId = req.params.id;
    if (!user || user.role !== client_1.Role.driver) {
        res.status(401).json({ error: 'Unauthorized or invalid role' });
        return;
    }
    // Проверяем существование заказа
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            offers: {
                where: { driverId: user.id }
            }
        }
    });
    if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
    }
    // Проверяем количество предложений от этого водителя
    if (order.offers.length >= 3) {
        res.status(400).json({ error: 'Maximum number of offers (3) reached' });
        return;
    }
    const result = order_validator_1.createOfferSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            issues: result.error.issues
        });
        return;
    }
    const { price } = result.data;
    try {
        const offer = await prisma_1.prisma.priceOffer.create({
            data: {
                price,
                orderId,
                driverId: user.id,
                attempt: order.offers.length + 1
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        username: true,
                        carModel: true,
                        carNumber: true
                    }
                }
            }
        });
        // Уведомляем пассажира о новом предложении
        server_1.io.to(`order_${orderId}`).emit('newOffer', {
            orderId,
            offer: {
                id: offer.id,
                price: offer.price,
                driver: offer.driver
            }
        });
        res.json({
            success: true,
            offer
        });
    }
    catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({
            success: false,
            error: 'Could not create offer'
        });
    }
};
exports.createPriceOffer = createPriceOffer;
// 🔹 Принять ценовое предложение
const acceptOffer = async (req, res) => {
    const user = req.user;
    const orderId = req.params.id;
    const { offerId } = req.body;
    if (!user || user.role !== client_1.Role.passenger) {
        res.status(401).json({ error: 'Unauthorized or invalid role' });
        return;
    }
    try {
        // Проверяем существование заказа и предложения
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    include: {
                        driver: true
                    }
                }
            }
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        if (order.passengerId !== user.id) {
            res.status(403).json({ error: 'Not authorized to accept offers for this order' });
            return;
        }
        const offer = order.offers.find(o => o.id === offerId);
        if (!offer) {
            res.status(404).json({ error: 'Offer not found' });
            return;
        }
        // Обновляем заказ и предложение
        const [updatedOffer, updatedOrder] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.priceOffer.update({
                where: { id: offerId },
                data: { status: 'accepted' }
            }),
            prisma_1.prisma.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.accepted,
                    driverId: offer.driverId,
                    finalPrice: offer.price
                },
                include: {
                    passenger: {
                        select: {
                            id: true,
                            username: true,
                            telegramId: true
                        }
                    },
                    driver: {
                        select: {
                            id: true,
                            username: true,
                            telegramId: true,
                            carModel: true,
                            carNumber: true
                        }
                    }
                }
            })
        ]);
        // Отклоняем все остальные предложения
        await prisma_1.prisma.priceOffer.updateMany({
            where: {
                orderId,
                id: { not: offerId }
            },
            data: { status: 'rejected' }
        });
        // Уведомляем водителя о принятии предложения
        server_1.io.to(`user_${offer.driverId}`).emit('offerAccepted', {
            orderId,
            order: updatedOrder
        });
        // Уведомляем всех остальных водителей
        order.offers
            .filter(o => o.id !== offerId)
            .forEach(o => {
            server_1.io.to(`user_${o.driver.id}`).emit('offerRejected', {
                orderId,
                offerId: o.id
            });
        });
        res.json({
            success: true,
            order: updatedOrder
        });
    }
    catch (error) {
        console.error('Error accepting offer:', error);
        res.status(500).json({
            success: false,
            error: 'Could not accept offer'
        });
    }
};
exports.acceptOffer = acceptOffer;
// 🔹 Отклонить ценовое предложение
const rejectOffer = async (req, res) => {
    const user = req.user;
    const orderId = req.params.id;
    const { offerId } = req.body;
    if (!user || user.role !== client_1.Role.passenger) {
        res.status(401).json({ error: 'Unauthorized or invalid role' });
        return;
    }
    try {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    include: {
                        driver: true
                    }
                }
            }
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        if (order.passengerId !== user.id) {
            res.status(403).json({ error: 'Not authorized to reject offers for this order' });
            return;
        }
        const offer = order.offers.find(o => o.id === offerId);
        if (!offer) {
            res.status(404).json({ error: 'Offer not found' });
            return;
        }
        const updatedOffer = await prisma_1.prisma.priceOffer.update({
            where: { id: offerId },
            data: { status: 'rejected' },
            include: {
                driver: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        // Уведомляем водителя об отклонении предложения
        server_1.io.to(`user_${offer.driverId}`).emit('offerRejected', {
            orderId,
            offerId
        });
        res.json({
            success: true,
            offer: updatedOffer
        });
    }
    catch (error) {
        console.error('Error rejecting offer:', error);
        res.status(500).json({
            success: false,
            error: 'Could not reject offer'
        });
    }
};
exports.rejectOffer = rejectOffer;
// 🔹 Начать поездку
const startOrder = async (req, res) => {
    const user = req.user;
    const id = req.params.id;
    if (!user || user.role !== client_1.Role.driver) {
        res.status(401).json({ error: 'Unauthorized or invalid role' });
        return;
    }
    try {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id }
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        if (order.driverId !== user.id) {
            res.status(403).json({ error: 'Not authorized to start this order' });
            return;
        }
        if (order.status !== client_1.OrderStatus.accepted) {
            res.status(400).json({ error: 'Order must be accepted before starting' });
            return;
        }
        const updatedOrder = await prisma_1.prisma.order.update({
            where: { id },
            data: {
                status: client_1.OrderStatus.inProgress,
                startedAt: new Date()
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true,
                        carModel: true,
                        carNumber: true
                    }
                }
            }
        });
        // Уведомляем пассажира о начале поездки
        server_1.io.to(`order_${id}`).emit('orderStarted', {
            orderId: id,
            startedAt: updatedOrder.startedAt
        });
        res.json({
            success: true,
            order: updatedOrder
        });
    }
    catch (error) {
        console.error('Error starting order:', error);
        res.status(500).json({
            success: false,
            error: 'Could not start order'
        });
    }
};
exports.startOrder = startOrder;
// 🗑 Отменить заказ
const cancelOrder = async (req, res) => {
    const user = req.user;
    const id = req.params.id;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id },
            include: {
                passenger: true,
                driver: true
            }
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        // Проверяем права на отмену
        if (order.passengerId !== user.id && order.driverId !== user.id) {
            res.status(403).json({ error: 'Not authorized to cancel this order' });
            return;
        }
        // Проверяем возможность отмены
        if (order.status === client_1.OrderStatus.completed) {
            res.status(400).json({ error: 'Cannot cancel completed order' });
            return;
        }
        const updatedOrder = await prisma_1.prisma.order.update({
            where: { id },
            data: {
                status: client_1.OrderStatus.cancelled,
                driverId: null // Убираем привязку к водителю
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        username: true,
                        telegramId: true,
                        carModel: true,
                        carNumber: true
                    }
                }
            }
        });
        // Уведомляем всех участников
        server_1.io.to(`order_${id}`).emit('orderCancelled', {
            orderId: id,
            cancelledBy: {
                id: user.id,
                role: user.role
            }
        });
        // Если заказ был принят, уведомляем водителя
        if (order.driverId) {
            server_1.io.to(`user_${order.driverId}`).emit('orderCancelled', {
                orderId: id,
                cancelledBy: {
                    id: user.id,
                    role: user.role
                }
            });
        }
        res.json({
            success: true,
            order: updatedOrder
        });
    }
    catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            error: 'Could not cancel order'
        });
    }
};
exports.cancelOrder = cancelOrder;
