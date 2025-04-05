"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTelegram = void 0;
const prisma_1 = require("../lib/prisma");
const telegram_1 = require("../lib/telegram");
const authenticateTelegram = async (req, res, next) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        if (!initData) {
            return res.status(401).json({ message: 'No Telegram init data provided' });
        }
        const telegramData = await (0, telegram_1.verifyTelegramWebAppData)(initData);
        if (!telegramData || !telegramData.user) {
            return res.status(401).json({ message: 'Invalid Telegram init data' });
        }
        const telegramUser = telegramData.user;
        const user = await prisma_1.prisma.user.findUnique({
            where: { telegramId: telegramUser.id.toString() }
        });
        if (!user) {
            const newUser = await prisma_1.prisma.user.create({
                data: {
                    telegramId: telegramUser.id.toString(),
                    username: telegramUser.username || telegramUser.first_name,
                    role: 'passenger',
                    offerCount: 0
                }
            });
            req.user = newUser;
        }
        else {
            req.user = user;
        }
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};
exports.authenticateTelegram = authenticateTelegram;
