"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
const prisma_1 = require("../lib/prisma");
const createOrder = async (passengerId, price) => {
    return await prisma_1.prisma.order.create({
        data: {
            passengerId,
            price,
            status: 'pending'
        }
    });
};
exports.createOrder = createOrder;
