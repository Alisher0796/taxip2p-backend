import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyTelegramWebAppData } from '../lib/telegram';
import { TelegramAuthData, AuthUser, AuthResponse } from '../types/auth.types';

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

export const authWithTelegram = async (req: Request, res: Response): Promise<void> => {
  try {
    const initData = req.headers['x-telegram-init-data'] as string;
    if (!initData) {
      res.status(400).json({ 
        success: false,
        error: 'Missing Telegram init data' 
      });
      return;
    }

    // Проверяем данные от Telegram WebApp
    const isValid = await verifyTelegramWebAppData(initData);
    if (!isValid) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid Telegram data' 
      });
      return;
    }

    const { id: telegramId, first_name, username, role, carModel, carNumber } = req.body as TelegramAuthData;
    
    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: USER_SELECT_FIELDS
    });

    if (!user) {
      // Создаем нового пользователя
      user = await prisma.user.create({
        data: {
          telegramId,
          username: username || first_name,
          role: role || Role.passenger,
          ...(role === Role.driver ? { 
            carModel: carModel || null,
            carNumber: carNumber || null 
          } : {})
        },
        select: USER_SELECT_FIELDS
      });
    } else if (role && (user.role !== role || (role === Role.driver && (!user.carModel || !user.carNumber)))) {
      // Обновляем роль и данные водителя
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: username || first_name,
          role,
          ...(role === Role.driver ? {
            carModel: carModel || user.carModel,
            carNumber: carNumber || user.carNumber
          } : {
            carModel: null,
            carNumber: null
          })
        },
        select: USER_SELECT_FIELDS
      });
    }

    const response: AuthResponse = {
      success: true,
      user: user as AuthUser,
      token: telegramId // В реальном приложении здесь должен быть JWT
    };

    res.json(response);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Обновление роли пользователя
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as AuthUser;
    const { role, carModel, carNumber } = req.body;

    if (!user || !role) {
      res.status(400).json({ 
        success: false,
        error: 'Missing user or role' 
      });
      return;
    }

    if (role === Role.driver && (!carModel || !carNumber)) {
      res.status(400).json({ 
        success: false,
        error: 'Driver data is required' 
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role,
        carModel: role === Role.driver ? carModel : null,
        carNumber: role === Role.driver ? carNumber : null
      },
      select: USER_SELECT_FIELDS
    });

    const response: AuthResponse = {
      success: true,
      user: updatedUser as AuthUser,
      token: user.telegramId
    };

    res.json(response);
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Could not update role'
    });
  }
};
