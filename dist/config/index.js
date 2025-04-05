"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 8080,
    botToken: process.env.BOT_TOKEN,
    database: {
        url: process.env.DATABASE_URL
    },
    cors: {
        origins: [
            'https://taxip2p-frontend.vercel.app',
            'https://taxip2p-frontend-gp43xwdtr-alishers-projects-e810444a.vercel.app',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id', 'x-telegram-init-data'],
    },
    security: {
        telegramAuthTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        rateLimits: {
            auth: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100 // limit each IP to 100 requests per windowMs
            }
        }
    },
    messages: {
        maxLength: 1000,
        retentionDays: 30 // сколько дней хранить сообщения
    }
};
