import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { createOrderSchema, updateOrderSchema } from '../validators/order.validator'

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
        status: 'pending',
        passengerId: user.id
      }
    })

    res.status(201).json(newOrder)
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Could not create order' })
  }
}

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
      data: { status: 'completed' }
    })

    res.json(completed)
  } catch (error) {
    console.error('Error completing order:', error)
    res.status(500).json({ error: 'Could not complete order' })
  }
}
