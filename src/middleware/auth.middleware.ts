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
    console.log('[Auth] Headers:', req.headers);
    const initData = req.headers['x-telegram-init-data'];
    
    // Проверяем наличие данных
    if (!initData) {
      return res.status(401).json({ 
        message: 'No Telegram init data provided',
        error: 'Missing X-Telegram-Init-Data header'
      });
    }

    // Проверяем формат данных
    if (Array.isArray(initData)) {
      return res.status(401).json({ 
        message: 'Invalid Telegram init data format',
        error: 'Init data must be a string'
      });
    }

    // Проверяем подпись Telegram
    console.log('[Auth] Verifying initData:', initData);
    const telegramData = await verifyTelegramWebAppData(initData);
    console.log('[Auth] Telegram data:', telegramData);
    if (!telegramData || !telegramData.user) {
      return res.status(401).json({ 
        message: 'Invalid Telegram init data',
        error: 'Hash verification failed',
        initData
      });
    }

    const telegramUser = telegramData.user;
    console.log('[Auth] Looking for user with telegramId:', telegramUser.id.toString());
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
