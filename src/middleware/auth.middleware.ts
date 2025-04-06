import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyTelegramWebAppData } from '../lib/telegram';
import { Role } from '@prisma/client';

// Кэш пользователей для уменьшения нагрузки на БД
const userCache = new Map<string, { user: AuthUser; timestamp: number }>();

// Время жизни кэша (5 минут)
const CACHE_TTL = 5 * 60 * 1000;

export interface AuthUser {
  id: string;
  username: string;
  telegramId: string;
  role: Role;
  carModel: string | null;
  carNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  offerCount: number;
  rating: number;
  isBlocked: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const initData = req.headers['x-telegram-init-data'];
    
    // 1. Проверяем наличие и формат данных
    if (!initData || Array.isArray(initData)) {
      return res.status(401).json({ 
        message: 'Invalid or missing Telegram init data'
      });
    }

    // 2. Проверяем подпись Telegram
    const telegramData = await verifyTelegramWebAppData(initData);
    if (!telegramData?.user) {
      return res.status(401).json({ 
        message: 'Invalid Telegram authentication'
      });
    }

    const telegramId = telegramData.user.id.toString();

    // 3. Проверяем кэш
    const cached = userCache.get(telegramId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      req.user = cached.user;
      return next();
    }

    // 4. Ищем пользователя в БД
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    // 5. Создаём нового пользователя, если не нашли
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: telegramData.user.username || telegramData.user.first_name,
          role: 'passenger',
          offerCount: 0
        }
      });
    }

    // 6. Обновляем кэш
    userCache.set(telegramId, {
      user,
      timestamp: Date.now()
    });

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
};
