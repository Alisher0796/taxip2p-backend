import { Request, Response, NextFunction } from 'express'
import { prisma } from '../server'

export const authenticateTelegram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.header('x-telegram-id')

  if (!telegramId) {
    res.status(401).json({ error: 'No Telegram ID provided' })
    return
  }

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } })

    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    req.user = user
    next()
  } catch {
    res.status(500).json({ error: 'Authorization failed' })
  }
}
