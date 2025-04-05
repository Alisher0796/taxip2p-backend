"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptOrder = exports.completeOrder = exports.updateOrder = exports.createOrder = exports.getDriverActiveOrders = exports.getActiveOrders = exports.getAllOrders = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const order_validator_1 = require("../validators/order.validator");
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
                passenger: true,
                driver: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(orders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllOrders = getAllOrders;
// 🔹 Получить активные заказы пассажира
const getActiveOrders = async (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: {
                passengerId: user.id,
                status: client_1.OrderStatus.pending
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(orders);
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
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const result = order_validator_1.createOrderSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error.errors });
        return;
    }
    const { price } = result.data;
    try {
        const newOrder = await prisma_1.prisma.order.create({
            data: {
                price,
                status: client_1.OrderStatus.pending,
                passengerId: user.id
            }
        });
        res.status(201).json(newOrder);
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Could not create order' });
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
    const result = order_validator_1.updateOrderSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error.errors });
        return;
    }
    const { price } = result.data;
    try {
        const updated = await prisma_1.prisma.order.update({
            where: { id },
            data: { price }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Could not update order' });
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
    try {
        const completed = await prisma_1.prisma.order.update({
            where: { id },
            data: { status: client_1.OrderStatus.completed }
        });
        res.json(completed);
    }
    catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({ error: 'Could not complete order' });
    }
};
exports.completeOrder = completeOrder;
// 🔹 Принять заказ (водителем)
const acceptOrder = async (req, res) => {
    const user = req.user;
    const id = req.params.id;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const accepted = await prisma_1.prisma.order.update({
            where: { id },
            data: {
                status: client_1.OrderStatus.accepted,
                driverId: user.id
            }
        });
        res.json(accepted);
    }
    catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({ error: 'Could not accept order' });
    }
};
exports.acceptOrder = acceptOrder;
