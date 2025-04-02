"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    price: zod_1.z.number().min(1, 'Цена должна быть больше 0')
});
exports.updateOrderSchema = zod_1.z.object({
    price: zod_1.z.number().min(1, 'Цена должна быть больше 0')
});
