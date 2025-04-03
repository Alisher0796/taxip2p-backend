"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTelegram = void 0;
const prisma_1 = require("../lib/prisma");
const authenticateTelegram = async (req, res, next) => {
    const rawId = req.header('x-telegram-id');
    const username = req.header('x-telegram-username') || 'Anonymous'; // ⬅️ добавили
    const telegramId = String(rawId);
    if (!telegramId) {
        res.status(401).json({ error: 'No Telegram ID provided' });
        return;
    }
    try {
        let user = await prisma_1.prisma.user.findUnique({
            where: { telegramId },
        });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    telegramId,
                    username: String(username), // ⬅️ добавлено
                    role: 'passenger',
                },
            });
        }
        req.user = {
            id: user.id,
            role: user.role,
        };
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authorization failed' });
    }
};
exports.authenticateTelegram = authenticateTelegram;
