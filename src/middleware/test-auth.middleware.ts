import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthUser } from './auth.middleware';

/**
 * Временный middleware для тестирования API без Telegram аутентификации
 * Устанавливает тестового пользователя во все запросы
 * ВНИМАНИЕ: Использовать только для тестирования!
 */
export const testAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Создаем тестового пользователя
  const testUser: AuthUser = {
    id: 'test-user-id-123456789',
    username: 'test_user',
    telegramId: '123456789',
    role: Role.passenger,
    carModel: null,
    carNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    offerCount: 0,
    rating: 5,
    isBlocked: false
  };

  // Устанавливаем пользователя в запрос
  req.user = testUser;
  
  next();
};
