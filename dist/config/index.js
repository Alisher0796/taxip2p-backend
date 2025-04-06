"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080,
    botToken: process.env.BOT_TOKEN,
    clientUrl: process.env.CLIENT_URL || 'https://taxip2p-frontend.vercel.app',
    database: {
        url: process.env.DATABASE_URL,
        logging: process.env.NODE_ENV === 'development'
    },
    cors: {
        origins: [
            process.env.CLIENT_URL || 'https://taxip2p-frontend.vercel.app',
            'https://taxip2p-frontend.vercel.app',
            'https://taxip2p-frontend-gp43xwdtr-alishers-projects-e810444a.vercel.app',
            'https://taxip2p-frontend-git-main-alishers-projects-e810444a.vercel.app',
            ...(process.env.NODE_ENV === 'development' ? [
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:3000',
                'http://127.0.0.1:3000'
            ] : [])
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id', 'x-telegram-init-data'],
    },
    security: {
        telegramAuthTTL: parseInt(process.env.TELEGRAM_AUTH_TTL || '86400000'),
        rateLimits: {
            api: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
                max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
            }
        }
    },
    websocket: {
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000'),
        pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
        maxBufferSize: parseInt(process.env.WS_MAX_BUFFER_SIZE || '1000000')
    },
    messages: {
        maxLength: 1000,
        retentionDays: 30
    },
    orders: {
        dailyLimit: parseInt(process.env.ORDER_DAILY_LIMIT || '10'),
        offerTimeoutMs: parseInt(process.env.ORDER_OFFER_TIMEOUT || '300000'), // 5 минут
        maxActiveOrders: parseInt(process.env.ORDER_MAX_ACTIVE || '3'),
        maxOffersPerOrder: parseInt(process.env.ORDER_MAX_OFFERS || '5'),
        minPriceKzt: parseInt(process.env.ORDER_MIN_PRICE || '500'),
        maxPriceKzt: parseInt(process.env.ORDER_MAX_PRICE || '50000'),
        minDriverRating: parseFloat(process.env.ORDER_MIN_DRIVER_RATING || '4.0'),
        cache: {
            ttl: parseInt(process.env.ORDER_CACHE_TTL || '30000'), // 30 секунд
            size: parseInt(process.env.ORDER_CACHE_SIZE || '1000')
        }
    }
};
