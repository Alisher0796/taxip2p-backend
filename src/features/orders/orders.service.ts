import { PrismaClient, OrderStatus, User, Role } from '@prisma/client';
import { RedisClientType } from 'redis';
import { CreateOrderDTO, UpdateOrderDTO, CreatePriceOfferDTO, OrderError, OrderResponse } from './orders.types';
import { formatOrderResponse, invalidateActiveOrdersCache, validateOrderTransition } from './orders.utils';

export class OrderService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClientType
  ) {}

  async createOrder({ fromAddress, toAddress, price, comment, pickupTime }: CreateOrderDTO, userId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.create({
      data: {
        fromAddress,
        toAddress,
        price: price || null,
        comment: comment || null,
        pickupTime: pickupTime || 'MINS_15',
        passengerId: userId,
        status: OrderStatus.pending
      },
      include: {
        passenger: true,
        driver: true,
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    await invalidateActiveOrdersCache(this.redis);
    return formatOrderResponse(order, this.prisma);
  }

  async updateOrder(id: string, data: UpdateOrderDTO): Promise<OrderResponse> {
    const order = await this.prisma.order.update({
      where: { id },
      data,
      include: {
        passenger: true,
        driver: true,
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    await invalidateActiveOrdersCache(this.redis);
    return formatOrderResponse(order, this.prisma);
  }

  async createPriceOffer(orderId: string, { price, comment, expiresAt }: CreatePriceOfferDTO, driverId: string): Promise<OrderResponse> {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          offers: true
        }
      });

      if (!order) {
        throw this.createError('ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.status !== 'pending') {
        throw this.createError('INVALID_STATUS', 'Order is not in pending status');
      }

      if (order.offers.length >= 5) {
        throw this.createError('MAX_OFFERS_REACHED', 'Maximum number of offers reached');
      }

      const offer = await tx.priceOffer.create({
        data: {
          price,
          comment,
          expiresAt,
          orderId,
          driverId,
          status: 'pending'
        }
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          passenger: true,
          driver: true,
          offers: {
            include: {
              driver: true
            }
          }
        }
      });
    });

    if (!result) {
      throw this.createError('TRANSACTION_FAILED', 'Failed to create offer');
    }

    await invalidateActiveOrdersCache(this.redis);
    return formatOrderResponse(result, this.prisma);
  }

  async acceptOffer(orderId: string, offerId: string): Promise<OrderResponse> {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { offers: true }
      });

      if (!order) {
        throw this.createError('ORDER_NOT_FOUND', 'Order not found');
      }

      const offer = order.offers.find(o => o.id === offerId);
      if (!offer) {
        throw this.createError('OFFER_NOT_FOUND', 'Offer not found');
      }

      const existingOffers = await tx.priceOffer.findMany({
        where: { orderId },
        include: {
          driver: true
        }
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'accepted',
          driverId: offer.driverId,
          price: offer.price
        },
        include: {
          passenger: true,
          driver: true,
          offers: {
            include: {
              driver: true
            }
          }
        }
      });

      await tx.priceOffer.updateMany({
        where: {
          orderId,
          id: { not: offerId }
        },
        data: {
          status: 'rejected'
        }
      });

      return updatedOrder;
    });

    await invalidateActiveOrdersCache(this.redis);
    return formatOrderResponse(result, this.prisma);
  }

  async updateOrderStatus(id: string, newStatus: OrderStatus, user: { id: string; role: Role }): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        passenger: true,
        driver: true,
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!order) {
      throw this.createError('ORDER_NOT_FOUND', 'Order not found');
    }

    if (!validateOrderTransition(order.status, newStatus)) {
      throw this.createError('INVALID_TRANSITION', `Cannot transition from ${order.status} to ${newStatus}`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: newStatus
      },
      include: {
        passenger: true,
        driver: true,
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    await invalidateActiveOrdersCache(this.redis);
    return formatOrderResponse(updatedOrder, this.prisma);
  }

  async getOrderById(id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        passenger: true,
        driver: true,
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!order) {
      throw this.createError('ORDER_NOT_FOUND', 'Order not found');
    }

    return formatOrderResponse(order, this.prisma);
  }

  async getActiveOrders(): Promise<OrderResponse[]> {
    const activeStatuses = [OrderStatus.pending, OrderStatus.accepted, OrderStatus.inProgress];
    const orders = await this.prisma.order.findMany({
      where: {
        status: {
          in: activeStatuses
        }
      },
      include: {
        passenger: true,
        driver: true,
        offers: {
          include: {
            driver: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return Promise.all(orders.map(order => formatOrderResponse(order, this.prisma)));
  }

  private createError(code: string, message: string, details?: Record<string, any>): OrderError {
    return { code, message, details };
  }
}
