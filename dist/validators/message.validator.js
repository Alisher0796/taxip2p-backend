"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageSchema = void 0;
const zod_1 = require("zod");
const index_1 = require("@config/index");
exports.createMessageSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid('Некорректный ID заказа'),
    text: zod_1.z.string()
        .min(1, 'Сообщение не может быть пустым')
        .max(index_1.config.messages.maxLength, `Сообщение не может быть длиннее ${index_1.config.messages.maxLength} символов`)
});
