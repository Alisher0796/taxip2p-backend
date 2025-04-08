"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = require("@lib/prisma");
const compression_1 = __importDefault(require("compression"));
const orders_routes_1 = __importDefault(require("@features/orders/orders.routes"));
const user_routes_1 = __importDefault(require("@features/users/user.routes"));
const message_routes_1 = __importDefault(require("@features/messages/message.routes"));
const auth_routes_1 = __importDefault(require("@features/auth/auth.routes"));
const profile_routes_1 = __importDefault(require("@features/profiles/profile.routes"));
const index_1 = require("@config/index");
const socket_1 = require("@lib/socket");
const auth_middleware_1 = require("@middleware/auth.middleware");
// Создаем Express приложение
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Основные middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
// CORS с белым списком
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || index_1.config.cors.origins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('CORS origin not allowed'));
        }
    },
    methods: index_1.config.cors.methods,
    allowedHeaders: index_1.config.cors.allowedHeaders,
    credentials: true,
    maxAge: 86400 // 24 часа кэширование preflight
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // Максимум 100 запросов с одного IP
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);
// Парсинг JSON с ограничением размера
app.use(express_1.default.json({ limit: '10kb' }));
// Базовая защита
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
// API роуты с аутентификацией
app.use('/api/orders', auth_middleware_1.authenticateTelegram, orders_routes_1.default);
app.use('/api/users', auth_middleware_1.authenticateTelegram, user_routes_1.default);
app.use('/api/messages', auth_middleware_1.authenticateTelegram, message_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/profile', auth_middleware_1.authenticateTelegram, profile_routes_1.default);
// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('[App] Error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'Internal server error' });
});
// Инициализируем WebSocket и сохраняем в app.locals
app.locals.io = (0, socket_1.initializeSocket)(server);
// Graceful shutdown
const shutdown = async () => {
    console.log('\n[App] Shutting down...');
    // Закрываем HTTP сервер и WebSocket соединения
    server.close(() => {
        console.log('[HTTP/WebSocket] Closed all connections');
    });
    // Закрываем соединение с БД
    await prisma_1.prisma.$disconnect();
    console.log('[Database] Disconnected');
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Запуск сервера
const PORT = 5002; // Временно используем другой порт
server.listen(PORT, () => {
    console.log(`[App] Server running on port ${PORT}`);
});
