import { PrismaClient, User, Role, Order, PriceOffer } from '@prisma/client';
import { RedisClientType } from 'redis';
import { CreateOrderDTO, UpdateOrderDTO, CreatePriceOfferDTO, OrderError, OrderResponse, OrderStatus, PickupTime } from './orders.types';

const CACHE_TTL = 3600; // 1 hour
const ACTIVE_ORDERS_KEY = 'active_orders';

export function canManageOrder(user: { id: string; role: Role }, passengerId: string): boolean {
  return user.role === Role.admin || user.id === passengerId;
}

export function canCreatePriceOffer(user: { role: Role; isBlocked: boolean }): boolean {
  return user.role === Role.driver && !user.isBlocked;
}

export async function formatOrderResponse(
  order: Order & { 
    passenger: User; 
    driver?: User | null; 
    offers?: (PriceOffer & { 
      driver: User 
    })[] 
  }, 
  prisma: PrismaClient
): Promise<OrderResponse> {
  const offers = order.offers?.map((offer: PriceOffer & { driver: User }) => ({
    id: offer.id,
    price: offer.price,
    comment: offer.comment || undefined,
    driver: {
      id: offer.driver.id,
      username: offer.driver.username,
      carModel: offer.driver.carModel || undefined,
      carNumber: offer.driver.carNumber || undefined
    },
    createdAt: offer.createdAt,
    expiresAt: offer.expiresAt || undefined
  }));

  return {
    id: order.id,
    status: order.status,
    fromAddress: order.fromAddress,
    toAddress: order.toAddress,
    price: order.price || undefined,
    comment: order.comment || undefined,
    pickupTime: order.pickupTime || undefined,
    passenger: {
      id: order.passenger.id,
      username: order.passenger.username
    },
    driver: order.driver ? {
      id: order.driver.id,
      username: order.driver.username,
      carModel: order.driver.carModel || undefined,
      carNumber: order.driver.carNumber || undefined
    } : undefined,
    offers,

    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export async function cacheActiveOrders(redis: RedisClientType, orders: OrderResponse[]): Promise<void> {
  try {
    await redis.setEx(ACTIVE_ORDERS_KEY, CACHE_TTL, JSON.stringify(orders));
  } catch (error) {
    console.error('Failed to cache active orders:', error);
  }
}

export async function getCachedActiveOrders(redis: RedisClientType): Promise<OrderResponse[] | null> {
  try {
    const cached = await redis.get(ACTIVE_ORDERS_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached active orders:', error);
    return null;
  }
}

export async function invalidateActiveOrdersCache(redis: RedisClientType): Promise<void> {
  try {
    await redis.del(ACTIVE_ORDERS_KEY);
  } catch (error) {
    console.error('Failed to invalidate active orders cache:', error);
  }
}

export function validateOrderTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['accepted', 'cancelled'],
    accepted: ['started', 'cancelled'],
    started: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
