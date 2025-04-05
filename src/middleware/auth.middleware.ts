import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { AuthUser } from '../types/auth.types';

const USER_SELECT_FIELDS = {
  id: true,
  username: true,
  telegramId: true,
  role: true,
  carModel: true,
  carNumber: true,
  createdAt: true,
  updatedAt: true,
  offerCount: true
} as const;

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
): Promise<void> => {
  const rawId = req.header('x-telegram-id');
  const username = req.header('x-telegram-username') || 'Anonymous';
  const telegramId = String(rawId);

  if (!telegramId) {
    res.status(401).json({ 
      success: false,
      error: 'No Telegram ID provided' 
    });
    return;
  }

  try {
    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: USER_SELECT_FIELDS
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: String(username),
          role: Role.passenger
        },
        select: USER_SELECT_FIELDS
      });
    }

    if (!user.role) {
      res.status(401).json({ 
        success: false,
        error: 'User role not set' 
      });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authorization failed' 
    });
  }
};
