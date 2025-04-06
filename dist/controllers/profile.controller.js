"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const updateProfileSchema = zod_1.z.object({
    role: zod_1.z.enum(['driver', 'passenger'])
});
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json({ data: user });
    }
    catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const result = updateProfileSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ message: 'Invalid request body' });
        }
        const { role } = result.data;
        let user = await prisma_1.prisma.user.findUnique({
            where: { id: authUser.id }
        });
        if (!user) {
            // Создаем нового пользователя, если он не существует
            user = await prisma_1.prisma.user.create({
                data: {
                    id: authUser.id,
                    role,
                    telegramId: authUser.telegramId,
                    username: authUser.username || '',
                    offerCount: 0
                }
            });
        }
        else {
            // Обновляем существующего пользователя
            user = await prisma_1.prisma.user.update({
                where: { id: authUser.id },
                data: { role }
            });
        }
        res.json({ data: user });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
