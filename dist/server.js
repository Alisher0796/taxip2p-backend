"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const compression_1 = __importDefault(require("compression"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const socket_1 = require("./sockets/socket");
const config_1 = require("./config");
const auth_middleware_1 = require("./middleware/auth.middleware");
// Инициализация PrismaClient с логированием только ошибок
exports.prisma = new client_1.PrismaClient({
    log: ['error'],
    errorFormat: 'minimal'
});
// Создаем Express приложение
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Основные middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
// CORS с белым списком
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || config_1.config.cors.origins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('CORS origin not allowed'));
        }
    },
    methods: config_1.config.cors.methods,
    allowedHeaders: config_1.config.cors.allowedHeaders,
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
// WebSocket с улучшенной конфигурацией
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: config_1.config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: config_1.config.cors.allowedHeaders
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket'],
    connectTimeout: 10000,
    maxHttpBufferSize: 1e6 // 1MB
});
(0, socket_1.setupSocket)(exports.io);
// Graceful shutdown
const shutdown = async () => {
    console.log('\n[App] Shutting down...');
    // Закрываем WebSocket соединения
    exports.io.close(() => {
        console.log('[WebSocket] Closed all connections');
    });
    // Закрываем HTTP сервер
    server.close(() => {
        console.log('[HTTP] Closed all connections');
    });
    // Закрываем соединение с БД
    await exports.prisma.$disconnect();
    console.log('[Database] Disconnected');
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Запуск сервера
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[App] Server running on port ${PORT}`);
});
