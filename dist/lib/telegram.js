"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramWebAppData = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
/**
 * Получаем botToken из конфигурации
 * В dev-окружении используем фейковый токен, если он не указан
 */
const botToken = config_1.config.botToken || (process.env.NODE_ENV === 'development' ? 'fake_token_for_dev' : null);
if (!botToken) {
    console.warn('⚠️ BOT_TOKEN environment variable is not set, Telegram auth will fail');
}
/**
 * Генерируем секретный ключ для проверки подписи
 * Согласно документации Telegram (https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app)
 */
const getSecretKey = (token) => {
    return crypto_1.default
        .createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
};
// Максимальное время жизни auth_date (24 часа)
const MAX_AUTH_AGE = 24 * 60 * 60; // в секундах
/**
 * Проверяет данные инициализации Telegram Web App
 * Согласно официальной документации: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * @param initData строка данных инициализации из заголовка x-telegram-init-data
 * @returns объект с данными пользователя или null в случае ошибки проверки
 */
const verifyTelegramWebAppData = (initData) => {
    try {
        // В dev-окружении можно разрешить запросы без проверки
        if (process.env.NODE_ENV === 'development' && !botToken) {
            console.warn('[Telegram] Dev mode: skipping validation');
            return {
                query_id: 'dev_query_id',
                user: {
                    id: 12345678,
                    first_name: 'Dev',
                    username: 'dev_user'
                },
                auth_date: Math.floor(Date.now() / 1000),
                hash: 'dev_hash'
            };
        }
        // Если нет токена бота, проверка невозможна
        if (!botToken) {
            console.error('[Telegram] No bot token available for validation');
            return null;
        }
        // Разбираем параметры из данных инициализации
        const params = new URLSearchParams(initData);
        // 1. Проверяем наличие обязательных полей
        const receivedHash = params.get('hash');
        const userStr = params.get('user');
        const authDateStr = params.get('auth_date');
        if (!receivedHash || !userStr || !authDateStr) {
            console.warn('[Telegram] Missing required fields', { hash: !!receivedHash, user: !!userStr, authDate: !!authDateStr });
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
            console.error('[Telegram] Auth date expired', { now, authDate, diff: now - authDate });
            return null;
        }
        // 3. Парсим данные пользователя
        let user;
        try {
            user = JSON.parse(userStr);
        }
        catch (err) {
            console.error('[Telegram] Failed to parse user JSON', err);
            return null;
        }
        // 4. Проверяем подпись по алгоритму из документации
        // Удаляем hash из данных для проверки
        params.delete('hash');
        // Сортируем все параметры в алфавитном порядке и формируем строку для проверки
        // ВАЖНО: Telegram требует конкретный формат - ключ=значение (без пробелов) 
        // и разделяются ключи символом \n
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        // Получаем секретный ключ для проверки
        const secretKey = getSecretKey(botToken);
        // Вычисляем хеш для проверки
        const calculatedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        // Сравниваем полученный хеш с ожидаемым
        if (calculatedHash !== receivedHash) {
            console.warn('[Telegram] Invalid hash', {
                calculated: calculatedHash.substring(0, 10) + '...',
                received: receivedHash.substring(0, 10) + '...',
                dataLength: dataCheckString.length
            });
            return null;
        }
        // Если проверка прошла успешно, возвращаем данные
        const queryId = params.get('query_id') || '';
        return {
            query_id: queryId,
            user,
            auth_date: authDate,
            hash: receivedHash,
        };
    }
    catch (error) {
        console.error('[Telegram] Verification error', error instanceof Error ? error.message : error);
        return null;
    }
};
exports.verifyTelegramWebAppData = verifyTelegramWebAppData;
