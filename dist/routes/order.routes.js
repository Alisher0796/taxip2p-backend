"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// 🔐 Получить все заказы текущего пользователя
router.get('/', auth_middleware_1.authenticateTelegram, order_controller_1.getAllOrders);
// 📝 Создать новый заказ
router.post('/', auth_middleware_1.authenticateTelegram, order_controller_1.createOrder);
// 🔄 Обновить заказ по ID
router.put('/:id', auth_middleware_1.authenticateTelegram, order_controller_1.updateOrder);
// ✅ Завершить заказ
router.put('/:id/complete', auth_middleware_1.authenticateTelegram, order_controller_1.completeOrder);
exports.default = router;
