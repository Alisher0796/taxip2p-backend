"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTelegram = void 0;
const prisma_1 = require("../lib/prisma");
const authenticateTelegram = async (req, res, next) => {
    const telegramId = req.header('x-telegram-id');
    if (!telegramId) {
        res.status(401).json({ error: 'No Telegram ID provided' });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { telegramId },
        });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.user = {
            id: user.id,
            role: user.role, // или типизируй правильно, если role строго ограничен
        };
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authorization failed' });
    }
};
exports.authenticateTelegram = authenticateTelegram;
