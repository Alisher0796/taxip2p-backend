"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageSchema = void 0;
const zod_1 = require("zod");
exports.createMessageSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid(),
    text: zod_1.z.string().min(1, 'Сообщение не может быть пустым')
});
