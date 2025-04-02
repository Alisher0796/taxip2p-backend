import { prisma } from '../lib/prisma'

export const createOrder = async (passengerId: string, price: number) => {
  return await prisma.order.create({
    data: {
      passengerId,
      price,
      status: 'pending'
    }
  })
}
