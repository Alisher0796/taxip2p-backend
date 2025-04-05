"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const createOrder = async (passengerId, price) => {
    return await prisma_1.prisma.order.create({
        data: {
            passengerId,
            price,
            status: 'pending',
            fromAddress: '', // будет обновлено позже
            toAddress: '', // будет обновлено позже
            pickupTime: client_1.PickupTime.MINS_30 // по умолчанию 30 минут
        }
    });
};
exports.createOrder = createOrder;
