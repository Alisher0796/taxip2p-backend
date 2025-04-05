"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTelegram = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const USER_SELECT_FIELDS = {
    id: true,
    username: true,
    telegramId: true,
    role: true,
    carModel: true,
    carNumber: true,
    createdAt: true,
    updatedAt: true,
    offerCount: true
};
const authenticateTelegram = async (req, res, next) => {
    const rawId = req.header('x-telegram-id');
    const username = req.header('x-telegram-username') || 'Anonymous';
    const telegramId = String(rawId);
    if (!telegramId) {
        res.status(401).json({
            success: false,
            error: 'No Telegram ID provided'
        });
        return;
    }
    try {
        let user = await prisma_1.prisma.user.findUnique({
            where: { telegramId },
            select: USER_SELECT_FIELDS
        });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    telegramId,
                    username: String(username),
                    role: client_1.Role.passenger
                },
                select: USER_SELECT_FIELDS
            });
        }
        if (!user.role) {
            res.status(401).json({
                success: false,
                error: 'User role not set'
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authorization failed'
        });
    }
};
exports.authenticateTelegram = authenticateTelegram;
