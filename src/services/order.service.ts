import { prisma } from '../lib/prisma'
import { PickupTime } from '@prisma/client'

export const createOrder = async (passengerId: string, price: number) => {
  return await prisma.order.create({
    data: {
      passengerId,
      price,
      status: 'pending',
      fromAddress: '', // будет обновлено позже
      toAddress: '', // будет обновлено позже
      pickupTime: PickupTime.MINS_30 // по умолчанию 30 минут
    }
  })
}
