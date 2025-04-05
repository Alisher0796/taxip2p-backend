import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { Role } from '@prisma/client'
import { AuthUser } from '../types/auth.types'

// Получить всех пользователей
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany()
    res.json(users)
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

// Получить пользователя по ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
}

// Создать нового пользователя
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { username, role, telegramId } = req.body

  if (!telegramId) {
    res.status(400).json({ error: 'telegramId is required' })
    return
  }

  try {
    const user = await prisma.user.create({
      data: { username, role, telegramId }
    })
    res.status(201).json(user)
  } catch {
    res.status(500).json({ error: 'Failed to create user' })
  }
}

// Обновить данные пользователя
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { username, role } = req.body

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { username, role },
    })

    res.json(user)
  } catch {
    res.status(500).json({ error: 'Failed to update user' })
  }
}
