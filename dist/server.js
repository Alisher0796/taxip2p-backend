"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const socket_1 = require("./sockets/socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const allowedOrigins = [
    'https://taxip2p-frontend.vercel.app',
    'https://taxip2p-frontend-gp43xwdtr-alishers-projects-e810444a.vercel.app',
];
console.log('[CORS] Разрешённые источники:', allowedOrigins);
exports.prisma = new client_1.PrismaClient();
// ✅ CORS для REST API
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log('[CORS] Блокирован origin:', origin);
            callback(new Error('CORS origin not allowed'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id'], // 💥 must be here
    credentials: true
}));
app.use(express_1.default.json());
// 📦 API
app.use('/api/orders', order_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/messages', message_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
// ✅ Корень
app.get('/', (req, res) => {
    res.send('🚀 TaxiP2P backend работает! CORS точно работает!');
});
// ✅ WebSocket
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['x-telegram-id'] // 👈 тоже обязательно!
    }
});
(0, socket_1.setupSocket)(io);
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
