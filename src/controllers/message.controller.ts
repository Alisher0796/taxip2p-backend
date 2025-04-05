import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { createMessageSchema } from '../validators/message.validator'
import { io } from '../server'
import { Message, User, Order } from '@prisma/client'

interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'username' | 'role'>
}

interface MessageWithOrderAndSender extends Message {
  order: Order
  sender: User
}

export const getMessagesByOrder = async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { orderId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }) as Promise<MessageWithSender[]>,
      prisma.message.count({
        where: { orderId }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      messages: messages.reverse(), // Возвращаем в хронологическом порядке
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
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
    console.error('Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// 🗑 Удалить сообщение
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        order: true
      }
    }) as MessageWithOrderAndSender | null;

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Проверяем права на удаление
    if (message.senderId !== user.id && message.order.passengerId !== user.id && message.order.driverId !== user.id) {
      res.status(403).json({ error: 'Not authorized to delete this message' });
      return;
    }

    // Удаляем сообщение
    await prisma.message.delete({
      where: { id }
    });

    // Уведомляем всех участников чата
    io.to(`order_${message.orderId}`).emit('messageDeleted', {
      messageId: id,
      deletedBy: {
        id: user.id,
        role: user.role
      }
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
}
