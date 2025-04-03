import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';

export const authenticateTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawId = req.header('x-telegram-id');
  const username = req.header('x-telegram-username') || 'Anonymous'; // ⬅️ добавили
  const telegramId = String(rawId);

  if (!telegramId) {
    res.status(401).json({ error: 'No Telegram ID provided' });
    return;
  }

  try {
    let user: User | null = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: String(username), // ⬅️ добавлено
          role: 'passenger',
        },
      });
    }

    req.user = {
      id: user.id,
      role: user.role as 'passenger' | 'driver',
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};
