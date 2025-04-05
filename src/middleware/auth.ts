import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyTelegramWebAppData } from '../lib/telegram';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        telegramId: number;
      };
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

    const { id: telegramId } = data.user;

    // Найти или создать пользователя
    const user = await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: {
        telegramId,
        name: data.user.first_name,
        username: data.user.username
      }
    });

    req.user = {
      id: user.id,
      telegramId: user.telegramId
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};
