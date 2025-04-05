import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyTelegramWebAppData } from '../lib/telegram';

import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
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
    if (!initData || typeof initData !== 'string') {
      return res.status(401).json({ message: 'No Telegram init data provided' });
    }

    const data = verifyTelegramWebAppData(initData);
    if (!data || !data.user) {
      return res.status(401).json({ message: 'Invalid Telegram init data' });
    }

    const telegramId = data.user.id.toString();

    // Найти или создать пользователя
    const user = await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: {
        telegramId,
        username: data.user.username || `user_${telegramId}`
      }
    });

    req.user = user;

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};
