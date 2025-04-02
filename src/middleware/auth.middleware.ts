import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';

export const authenticateTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const telegramId = req.header('x-telegram-id');

  if (!telegramId) {
    res.status(401).json({ error: 'No Telegram ID provided' });
    return;
  }

  try {
    const user: User | null = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      role: user.role as 'passenger' | 'driver', // или типизируй правильно, если role строго ограничен
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};
