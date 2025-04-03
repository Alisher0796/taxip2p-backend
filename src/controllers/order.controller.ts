import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { OrderStatus } from '@prisma/client'
import { createOrderSchema, updateOrderSchema } from '../validators/order.validator'

// 🔹 Получить все заказы пользователя (пассажир или водитель)
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { passengerId: user.id },
          { driverId: user.id }
        ]
      },
      include: {
        passenger: true,
        driver: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

// 🔹 Получить активные заказы пассажира
export const getActiveOrders = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        passengerId: user.id,
        status: OrderStatus.pending
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching active orders:', error)
    res.status(500).json({ error: 'Could not fetch active orders' })
  }
}

// 🔹 Получить активные заказы водителя
export const getDriverActiveOrders = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        driverId: user.id,
        status: OrderStatus.accepted
      },
      include: {
        passenger: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching driver orders:', error)
    res.status(500).json({ error: 'Could not fetch driver orders' })
  }
}

// 🔹 Создать заказ
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const result = createOrderSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors })
    return
  }

  const { price } = result.data

  try {
    const newOrder = await prisma.order.create({
      data: {
        price,
        status: OrderStatus.pending,
        passengerId: user.id
      }
    })

    res.status(201).json(newOrder)
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Could not create order' })
  }
}

// 🔹 Обновить заказ
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = req.params.id
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const result = updateOrderSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors })
    return
  }

  const { price } = result.data

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { price }
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating order:', error)
    res.status(500).json({ error: 'Could not update order' })
  }
}

// 🔹 Завершить заказ
export const completeOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = req.params.id
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const completed = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.completed }
    })

    res.json(completed)
  } catch (error) {
    console.error('Error completing order:', error)
    res.status(500).json({ error: 'Could not complete order' })
  }
}

// 🔹 Принять заказ (водителем)
export const acceptOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = req.params.id
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const accepted = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.accepted,
        driverId: user.id
      }
    })

    res.json(accepted)
  } catch (error) {
    console.error('Error accepting order:', error)
    res.status(500).json({ error: 'Could not accept order' })
  }
}
