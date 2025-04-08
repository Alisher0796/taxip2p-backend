import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from '@lib/prisma';
import compression from 'compression';

import orderRouter from '@features/orders/orders.routes';
import userRouter from '@features/users/user.routes';
import messageRouter from '@features/messages/message.routes';
import authRouter from '@features/auth/auth.routes';
import profileRouter from '@features/profiles/profile.routes';
import { config } from '@config/index';
import { initializeSocket } from '@lib/socket';
import { authenticateTelegram } from '@middleware/auth.middleware';

// Создаем Express приложение
const app = express();
const server = http.createServer(app);

// Основные middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS с белым списком
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS origin not allowed'));
    }
  },
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  credentials: true,
  maxAge: 86400 // 24 часа кэширование preflight
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Максимум 100 запросов с одного IP
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Парсинг JSON с ограничением размера
app.use(express.json({ limit: '10kb' }));

// Базовая защита
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Healthcheck эндпоинты для проверки работоспособности сервера
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Еще один endpoint для Railway healthcheck
app.head('/', (req, res) => {
  res.status(200).end();
});

// API роуты (временно без аутентификации для тестирования)
app.use('/api/orders', orderRouter);
app.use('/api/users', userRouter);
app.use('/api/messages', messageRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);

// Обработка ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[App] Error:', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ error: 'Internal server error' });
});

// Инициализируем WebSocket и сохраняем в app.locals
app.locals.io = initializeSocket(server);

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[App] Shutting down...');
  
  // Закрываем HTTP сервер и WebSocket соединения
  server.close(() => {
    console.log('[HTTP/WebSocket] Closed all connections');
  });

  // Закрываем соединение с БД
  await prisma.$disconnect();
  console.log('[Database] Disconnected');

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Запускаем сервер на всех интерфейсах (0.0.0.0)
const PORT = config.port || 5002;
server.listen(PORT, () => {
  console.log(`[App] Server running on port ${PORT}`);
});
