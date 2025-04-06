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
const verifyTelegramWebAppData = (initData) => {
    try {
        const params = new URLSearchParams(initData);
        const receivedHash = params.get('hash');
        if (!receivedHash) {
            console.error('[Telegram] Missing hash');
            return null;
        }
        // Удаляем hash перед генерацией подписи
        params.delete('hash');
        // Строим data_check_string (строго по алфавиту)
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        // Генерируем секретный ключ
        const secretKey = crypto_1.default
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        // Считаем HMAC
        const calculatedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        // Лог отладки
        console.log('Telegram initData validation:', {
            dataCheckString,
            calculatedHash,
            receivedHash,
            match: calculatedHash === receivedHash,
        });
        if (calculatedHash !== receivedHash) {
            console.warn('[Telegram] Invalid hash');
            return null;
        }
        const userStr = params.get('user');
        const queryId = params.get('query_id');
        const authDateStr = params.get('auth_date');
        if (!userStr || !queryId || !authDateStr) {
            console.warn('[Telegram] Missing required fields');
            return null;
        }
        let user;
        try {
            user = JSON.parse(userStr);
        }
        catch (err) {
            console.error('[Telegram] Failed to parse user JSON:', err);
            return null;
        }
        const authDate = parseInt(authDateStr, 10);
        if (isNaN(authDate)) {
            console.error('[Telegram] Invalid auth_date');
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
        console.error('Telegram WebApp verification error:', error);
        return null;
    }
};
exports.verifyTelegramWebAppData = verifyTelegramWebAppData;
