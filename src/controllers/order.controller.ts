import { Request, Response } from 'express'
import { prisma } from '../server'

// Получить все заказы текущего пользователя
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const orders = await prisma.order.findMany({
      where: user.role === 'passenger'
        ? { passengerId: user.id }
        : { driverId: user.id },
      include: {
        passenger: true,
        driver: true,
        messages: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json(orders)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

// Создать новый заказ
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const { passengerId, price } = req.body
  try {
    const order = await prisma.order.create({
      data: {
        passengerId,
        price,
        status: 'pending',
      },
    })
    res.status(201).json(order)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' })
  }
}

// Обновить заказ: назначить водителя или изменить статус
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { driverId, status } = req.body
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { driverId, status },
    })
    res.json(order)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' })
  }
}

// Завершить поездку
export const completeOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  try {
    const completedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })
    res.json(completedOrder)
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete order' })
  }
}
