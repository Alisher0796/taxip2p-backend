"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerActionSchema = exports.createOfferSchema = exports.updateOrderSchema = exports.createOrderSchema = exports.driverDataSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// Валидация данных водителя
exports.driverDataSchema = zod_1.z.object({
    carModel: zod_1.z.string().min(2, 'Марка авто должна быть не менее 2 символов'),
    carNumber: zod_1.z.string().min(4, 'Госномер должен быть не менее 4 символов')
});
// Валидация создания заказа
exports.createOrderSchema = zod_1.z.object({
    fromAddress: zod_1.z.string().min(5, 'Адрес отправления должен быть не менее 5 символов'),
    toAddress: zod_1.z.string().min(5, 'Адрес назначения должен быть не менее 5 символов'),
    price: zod_1.z.number().min(1, 'Цена должна быть больше 0').nullable().optional(),
    pickupTime: zod_1.z.nativeEnum(client_1.PickupTime, {
        required_error: 'Выберите время подачи',
        invalid_type_error: 'Неверное значение времени подачи'
    }),
    comment: zod_1.z.string().max(500, 'Комментарий не должен превышать 500 символов').optional()
});
// Валидация обновления заказа
exports.updateOrderSchema = zod_1.z.object({
    price: zod_1.z.number().min(1, 'Цена должна быть больше 0').optional(),
    status: zod_1.z.nativeEnum(client_1.OrderStatus).optional(),
    comment: zod_1.z.string().max(500, 'Комментарий не должен превышать 500 символов').optional()
});
// Валидация ценового предложения
exports.createOfferSchema = zod_1.z.object({
    price: zod_1.z.number().min(1, 'Цена должна быть больше 0')
});
// Валидация принятия/отклонения предложения
exports.offerActionSchema = zod_1.z.object({
    offerId: zod_1.z.string().uuid('Неверный формат ID предложения')
});
