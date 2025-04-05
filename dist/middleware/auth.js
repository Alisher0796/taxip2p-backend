"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTelegram = void 0;
const prisma_1 = require("../lib/prisma");
const telegram_1 = require("../lib/telegram");
const authenticateTelegram = async (req, res, next) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        if (!initData || typeof initData !== 'string') {
            return res.status(401).json({ message: 'No Telegram init data provided' });
        }
        const data = (0, telegram_1.verifyTelegramWebAppData)(initData);
        if (!data || !data.user) {
            return res.status(401).json({ message: 'Invalid Telegram init data' });
        }
        const telegramId = data.user.id.toString();
        // Найти или создать пользователя
        const user = await prisma_1.prisma.user.upsert({
            where: { telegramId },
            update: {},
            create: {
                telegramId,
                username: data.user.username || `user_${telegramId}`
            }
        });
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};
exports.authenticateTelegram = authenticateTelegram;
