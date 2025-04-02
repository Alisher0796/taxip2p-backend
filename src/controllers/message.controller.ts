import { Request, Response } from 'express'
import { prisma } from '../server'

// Получить сообщения по заказу
export const getMessagesByOrder = async (req: Request, res: Response) => {
  const { orderId } = req.params
  try {
    const messages = await prisma.message.findMany({
      where: { orderId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

// Отправить сообщение
export const createMessage = async (req: Request, res: Response) => {
  const { orderId, senderId, text } = req.body
  try {
    const message = await prisma.message.create({
      data: { orderId, senderId, text },
    })
    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' })
  }
}
