import { Request, Response } from 'express'
import { prisma } from '../server'

export const authWithTelegram = async (req: Request, res: Response): Promise<void> => {
  const { telegramId, username, role } = req.body

  if (!telegramId || !username || !role) {
    res.status(400).json({ error: 'Missing fields' })
    return
  }

  try {
    let user = await prisma.user.findUnique({ where: { telegramId } })

    if (!user) {
      user = await prisma.user.create({
        data: { telegramId, username, role },
      })
    }

    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Auth failed' })
  }
}
