"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.authWithTelegram = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const telegram_1 = require("../lib/telegram");
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
const authWithTelegram = async (req, res) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        if (!initData) {
            res.status(400).json({
                success: false,
                error: 'Missing Telegram init data'
            });
            return;
        }
        // Проверяем данные от Telegram WebApp
        const isValid = await (0, telegram_1.verifyTelegramWebAppData)(initData);
        if (!isValid) {
            res.status(401).json({
                success: false,
                error: 'Invalid Telegram data'
            });
            return;
        }
        const { id: telegramId, first_name, username, role, carModel, carNumber } = req.body;
        let user = await prisma_1.prisma.user.findUnique({
            where: { telegramId },
            select: USER_SELECT_FIELDS
        });
        if (!user) {
            // Создаем нового пользователя
            user = await prisma_1.prisma.user.create({
                data: {
                    telegramId,
                    username: username || first_name,
                    role: role || client_1.Role.passenger,
                    ...(role === client_1.Role.driver ? {
                        carModel: carModel || null,
                        carNumber: carNumber || null
                    } : {})
                },
                select: USER_SELECT_FIELDS
            });
        }
        else if (role && (user.role !== role || (role === client_1.Role.driver && (!user.carModel || !user.carNumber)))) {
            // Обновляем роль и данные водителя
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    username: username || first_name,
                    role,
                    ...(role === client_1.Role.driver ? {
                        carModel: carModel || user.carModel,
                        carNumber: carNumber || user.carNumber
                    } : {
                        carModel: null,
                        carNumber: null
                    })
                },
                select: USER_SELECT_FIELDS
            });
        }
        const response = {
            success: true,
            user: user,
            token: telegramId // В реальном приложении здесь должен быть JWT
        };
        res.json(response);
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};
exports.authWithTelegram = authWithTelegram;
// Обновление роли пользователя
const updateUserRole = async (req, res) => {
    try {
        const user = req.user;
        const { role, carModel, carNumber } = req.body;
        if (!user || !role) {
            res.status(400).json({
                success: false,
                error: 'Missing user or role'
            });
            return;
        }
        if (role === client_1.Role.driver && (!carModel || !carNumber)) {
            res.status(400).json({
                success: false,
                error: 'Driver data is required'
            });
            return;
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                role,
                carModel: role === client_1.Role.driver ? carModel : null,
                carNumber: role === client_1.Role.driver ? carNumber : null
            },
            select: USER_SELECT_FIELDS
        });
        const response = {
            success: true,
            user: updatedUser,
            token: user.telegramId
        };
        res.json(response);
    }
    catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({
            success: false,
            error: 'Could not update role'
        });
    }
};
exports.updateUserRole = updateUserRole;
