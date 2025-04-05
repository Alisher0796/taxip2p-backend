"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.prisma = void 0;
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
const config_1 = require("./config");
console.log('[CORS] Разрешённые источники:', config_1.config.cors.origins);
exports.prisma = new client_1.PrismaClient();
// ✅ CORS для REST API
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || config_1.config.cors.origins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log('[CORS] Блокирован origin:', origin);
            callback(new Error('CORS origin not allowed'));
        }
    },
    methods: config_1.config.cors.methods,
    allowedHeaders: config_1.config.cors.allowedHeaders,
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
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: config_1.config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: config_1.config.cors.allowedHeaders
    }
});
(0, socket_1.setupSocket)(exports.io);
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
