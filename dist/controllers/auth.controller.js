"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authWithTelegram = void 0;
const server_1 = require("../server");
const authWithTelegram = async (req, res) => {
    const { telegramId, username, role } = req.body;
    if (!telegramId || !username || !role) {
        res.status(400).json({ error: 'Missing fields' });
        return;
    }
    try {
        let user = await server_1.prisma.user.findUnique({ where: { telegramId } });
        if (!user) {
            user = await server_1.prisma.user.create({
                data: { telegramId, username, role },
            });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Auth failed' });
    }
};
exports.authWithTelegram = authWithTelegram;
