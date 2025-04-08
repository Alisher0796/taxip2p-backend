import { Request, Response } from 'express';
import { prisma } from '@lib/prisma';
import { z } from 'zod';
import { AuthUser } from '@middleware/auth.middleware';

const updateProfileSchema = z.object({
  role: z.enum(['driver', 'passenger'])
});

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const authUser = req.user as AuthUser | undefined;
    if (!authUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const { role } = result.data;

    let user = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (!user) {
      // Создаем нового пользователя, если он не существует
      user = await prisma.user.create({
        data: {
          id: authUser.id,
          role,
          telegramId: authUser.telegramId,
          username: authUser.username || '',
          offerCount: 0
        }
      });
    } else {
      // Обновляем существующего пользователя
      user = await prisma.user.update({
        where: { id: authUser.id },
        data: { role }
      });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
