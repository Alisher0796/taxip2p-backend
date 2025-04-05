"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const profile_controller_1 = require("../controllers/profile.controller");
const router = express_1.default.Router();
router.get('/', auth_middleware_1.authenticateTelegram, profile_controller_1.getProfile);
router.put('/', auth_middleware_1.authenticateTelegram, profile_controller_1.updateProfile);
exports.default = router;
