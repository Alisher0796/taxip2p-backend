"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 🔐 Получить все заказы текущего пользователя
router.get('/', auth_1.authenticateTelegram, order_controller_1.getAllOrders);
// 🔍 Получить активные заказы пассажира
router.get('/active', auth_1.authenticateTelegram, order_controller_1.getActiveOrders);
// 🚗 Получить активные заказы водителя
router.get('/driver-active', auth_1.authenticateTelegram, order_controller_1.getDriverActiveOrders);
// 📝 Создать новый заказ
router.post('/', auth_1.authenticateTelegram, order_controller_1.createOrder);
// 🔄 Обновить заказ по ID
router.put('/:id', auth_1.authenticateTelegram, order_controller_1.updateOrder);
// ✅ Завершить заказ
router.put('/:id/complete', auth_1.authenticateTelegram, order_controller_1.completeOrder);
// 💰 Сделать ценовое предложение
router.post('/:id/offer', auth_1.authenticateTelegram, order_controller_1.createPriceOffer);
// ✅ Принять ценовое предложение
router.post('/:id/offer/accept', auth_1.authenticateTelegram, order_controller_1.acceptOffer);
// ❌ Отклонить ценовое предложение
router.post('/:id/offer/reject', auth_1.authenticateTelegram, order_controller_1.rejectOffer);
// 🚗 Начать поездку
router.post('/:id/start', auth_1.authenticateTelegram, order_controller_1.startOrder);
// 🗑 Отменить заказ
router.post('/:id/cancel', auth_1.authenticateTelegram, order_controller_1.cancelOrder);
exports.default = router;
