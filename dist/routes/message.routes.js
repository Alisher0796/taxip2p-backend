"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.get('/:orderId', message_controller_1.getMessagesByOrder);
router.post('/', auth_middleware_1.authenticateTelegram, message_controller_1.createMessage);
router.delete('/:id', auth_middleware_1.authenticateTelegram, message_controller_1.deleteMessage);
exports.default = router;
