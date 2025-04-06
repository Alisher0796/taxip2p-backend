import { Request, Response } from 'express';
import { prisma } from '@lib/prisma';
import { verifyTelegramWebAppData } from '@lib/telegram';
import jwt from 'jsonwebtoken';
import { config } from '@config/index';
import { Role } from '@prisma/client';

export const authWithTelegram = async (req: Request, res: Response) => {
  try {
    const initData = req.headers['x-telegram-init-data'];

    // 1. Проверяем наличие и формат данных
    if (!initData || Array.isArray(initData)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing Telegram init data'
      });
    }

    // 2. Проверяем подпись Telegram
    const telegramData = await verifyTelegramWebAppData(initData);
    if (!telegramData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Telegram authentication'
      });
    }

    const telegramId = telegramData.user.id.toString();

    // 3. Ищем или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: telegramData.user.username || telegramData.user.first_name,
          role: Role.passenger,
          offerCount: 0,
          rating: 5.0
        }
      });
    }

    // 4. Генерируем JWT токен
    const token = jwt.sign(
      { 
        id: user.id,
        telegramId: user.telegramId,
        role: user.role
      },
      config.security.jwtSecret,
      { expiresIn: '7d' }
    );

    // 5. Отправляем ответ
    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('[Auth] Error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
