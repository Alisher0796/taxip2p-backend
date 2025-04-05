"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const prisma_1 = require("../lib/prisma");
// Получить всех пользователей
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany();
        res.json(users);
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
// Получить пользователя по ID
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
exports.getUserById = getUserById;
// Создать нового пользователя
const createUser = async (req, res) => {
    const { username, role, telegramId } = req.body;
    if (!telegramId) {
        res.status(400).json({ error: 'telegramId is required' });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.create({
            data: { username, role, telegramId }
        });
        res.status(201).json(user);
    }
    catch {
        res.status(500).json({ error: 'Failed to create user' });
    }
};
exports.createUser = createUser;
// Обновить данные пользователя
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, role } = req.body;
    try {
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: { username, role },
        });
        res.json(user);
    }
    catch {
        res.status(500).json({ error: 'Failed to update user' });
    }
};
exports.updateUser = updateUser;
