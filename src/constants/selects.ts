import { Prisma } from '@prisma/client';

export const userBaseSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  username: true,
  telegramId: true,
  role: true,
  carModel: true,
  carNumber: true,
  offerCount: true,
  rating: true,
  isBlocked: true,
  ordersAsPassenger: false,
  ordersAsDriver: false,
  messages: false,
  offers: false,
  orderHistory: false
} satisfies Prisma.UserSelect;

export const driverSelect = {
  ...userBaseSelect
} satisfies Prisma.UserSelect;

export const orderBaseSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  status: true,
  fromAddress: true,
  toAddress: true,
  price: true,
  pickupTime: true,
  comment: true,
  passengerId: true,
  driverId: true,
  history: {
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      action: true,
      metadata: true,
      user: {
        select: userBaseSelect
      }
    }
  }
} satisfies Prisma.OrderSelect;
