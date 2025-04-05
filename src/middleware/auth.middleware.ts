import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyTelegramWebAppData } from '../lib/telegram';

import { Role } from '@prisma/client';

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
    const initData = req.headers['x-telegram-init-data'] as string;
    if (!initData) {
      return res.status(401).json({ message: 'No Telegram init data provided' });
    }

    const telegramData = await verifyTelegramWebAppData(initData);
    if (!telegramData || !telegramData.user) {
      return res.status(401).json({ message: 'Invalid Telegram init data' });
    }

    const telegramUser = telegramData.user;
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      const newUser = await prisma.user.create({
        data: {
          telegramId: telegramUser.id.toString(),
          username: telegramUser.username || telegramUser.first_name,
          role: 'passenger',
          offerCount: 0
        }
      });
      req.user = newUser;
    } else {
      req.user = user;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};
