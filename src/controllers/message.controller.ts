import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { createMessageSchema } from '../validators/message.validator'

export const getMessagesByOrder = async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params

  try {
    const messages = await prisma.message.findMany({
      where: { orderId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    })

    res.json(messages)
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

export const createMessage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const result = createMessageSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors })
    return
  }

  const { orderId, text } = result.data
  const senderId = user.id

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.passengerId !== senderId && order.driverId !== senderId) {
      res.status(403).json({ error: 'You are not a participant of this order' })
      return
    }

    const message = await prisma.message.create({
      data: {
        orderId,
        senderId,
        text,
      }
    })

    res.status(201).json(message)
  } catch (error) {
    console.error('Failed to send message:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
}
