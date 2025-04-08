import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import orderRouter from './features/orders/orders.routes';
import userRouter from './features/users/user.routes';
import messageRouter from './features/messages/message.routes';
import authRouter from './features/auth/auth.routes';
import profileRouter from './features/profiles/profile.routes';
import { config } from './config';
import { initializeSocket } from './lib/socket';
import { authenticateTelegram } from './middleware/auth.middleware';

// Создаем Express приложение
const app = express();

// Настройка безопасности
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Максимум 100 запросов с одного IP
  message: 'Too many requests from this IP, please try again later'
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

// Роуты API
// Маршруты заказов
app.use('/api/orders', authenticateTelegram, orderRouter);
app.use('/api/users', authenticateTelegram, userRouter);
app.use('/api/messages', authenticateTelegram, messageRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', authenticateTelegram, profileRouter);

// Обработка ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[App] Error:', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ message: 'Internal server error' });
});

// Создаем HTTP сервер
const server = createServer(app);

// Инициализируем Socket.IO
const io = initializeSocket(server);

export { app, server };
