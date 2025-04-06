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
// Генерируем секретный ключ один раз при старте сервера
const secretKey = crypto_1.default
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
// Максимальное время жизни auth_date (24 часа)
const MAX_AUTH_AGE = 24 * 60 * 60; // в секундах
const verifyTelegramWebAppData = (initData) => {
    try {
        const params = new URLSearchParams(initData);
        // 1. Проверяем наличие всех необходимых полей
        const receivedHash = params.get('hash');
        const userStr = params.get('user');
        const queryId = params.get('query_id');
        const authDateStr = params.get('auth_date');
        if (!receivedHash || !userStr || !queryId || !authDateStr) {
            console.warn('[Telegram] Missing required fields');
            return null;
        }
        // 2. Проверяем время жизни auth_date
        const authDate = parseInt(authDateStr, 10);
        if (isNaN(authDate)) {
            console.error('[Telegram] Invalid auth_date');
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > MAX_AUTH_AGE) {
            console.error('[Telegram] Auth date expired');
            return null;
        }
        // 3. Парсим данные пользователя
        let user;
        try {
            user = JSON.parse(userStr);
        }
        catch (err) {
            console.error('[Telegram] Failed to parse user JSON');
            return null;
        }
        // 4. Проверяем подпись
        params.delete('hash');
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        const calculatedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        if (calculatedHash !== receivedHash) {
            console.warn('[Telegram] Invalid hash');
            return null;
        }
        return {
            query_id: queryId,
            user,
            auth_date: authDate,
            hash: receivedHash,
        };
    }
    catch (error) {
        console.error('[Telegram] Verification error');
        return null;
    }
};
exports.verifyTelegramWebAppData = verifyTelegramWebAppData;
