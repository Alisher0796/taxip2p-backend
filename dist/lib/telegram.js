"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramWebAppData = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const botToken = config_1.config.botToken;
if (!botToken) {
    throw new Error('BOT_TOKEN environment variable is not set');
}
const verifyTelegramWebAppData = async (initData) => {
    try {
        // Разбираем строку initData
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        const authDate = params.get('auth_date');
        if (!hash || !authDate) {
            console.error('Missing hash or auth_date in initData');
            return false;
        }
        // Проверяем время жизни auth_date
        const authTimestamp = parseInt(authDate) * 1000;
        const now = Date.now();
        if (now - authTimestamp > config_1.config.security.telegramAuthTTL) {
            console.error('Telegram auth data expired');
            return false;
        }
        params.delete('hash');
        // Сортируем параметры
        const pairs = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`);
        // Создаем data-check-string
        const dataCheckString = pairs.join('\n');
        // Создаем HMAC-SHA256
        const secretKey = crypto_1.default.createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        const hmac = crypto_1.default.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        const isValid = hmac === hash;
        if (!isValid) {
            console.error('Invalid Telegram hash');
        }
        return isValid;
    }
    catch (error) {
        console.error('Telegram WebApp verification error:', error);
        return false;
    }
};
exports.verifyTelegramWebAppData = verifyTelegramWebAppData;
