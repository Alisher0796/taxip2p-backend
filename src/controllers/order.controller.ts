import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { OrderStatus, Role, Prisma } from '@prisma/client';
import { createOrderSchema, updateOrderSchema, CreateOrderInput, createOfferSchema } from '../validators/order.validator';
import { io } from '../server';
import { AuthUser } from '../types/auth.types';

interface OrderResponse {
  success: boolean;
  order?: OrderWithRelations;
  error?: string;
  issues?: any[];
}

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    passenger: {
      select: {
        id: true;
        username: true;
        telegramId: true;
      };
    };
    driver?: {
      select: {
        id: true;
        username: true;
        telegramId: true;
        carModel: true;
        carNumber: true;
      };
    };
    offers: {
      include: {
        driver: {
          select: {
            id: true;
            username: true;
          };
        };
      };
    };
  };
}>;

// 🔹 Получить все заказы пользователя (пассажир или водитель)
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
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
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        driver: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        offers: {
          include: {
            driver: {
              select: {
                id: true,
                username: true,
                carModel: true,
                carNumber: true
              }
            }
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        messageCount: order._count.messages
      }))
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Could not fetch orders' });
  }
};

// 🔹 Получить активные заказы для текущей роли пользователя
export const getActiveOrders = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || !user.role) {
    res.status(401).json({ error: 'Unauthorized or role not set' });
    return;
  }

  try {
    const where = user.role === Role.passenger
      ? {
          passengerId: user.id,
          status: { in: [OrderStatus.pending, OrderStatus.negotiating] }
        }
      : {
          status: OrderStatus.pending,
          NOT: { passengerId: user.id }
        };

    const orders = await prisma.order.findMany({
      where,
      include: {
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        offers: {
          where: user.role === Role.driver ? { driverId: user.id } : {},
          select: {
            id: true,
            price: true,
            status: true,
            driver: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        hasOffer: order.offers.length > 0
      }))
    });
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({ error: 'Could not fetch active orders' });
  }
};

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
  const user = req.user;
  if (!user || user.role !== Role.passenger) {
    res.status(401).json({ error: 'Unauthorized or invalid role' });
    return;
  }

  const result = createOrderSchema.safeParse(req.body);
  
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: result.error.issues
    });
    return;
  }

  try {
    const validatedData = result.data;
    const order = await prisma.order.create({
      data: {
        fromAddress: validatedData.fromAddress,
        toAddress: validatedData.toAddress,
        price: validatedData.price || null,
        pickupTime: validatedData.pickupTime,
        comment: validatedData.comment,
        status: OrderStatus.pending,
        passengerId: user.id
      },
      include: {
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        offers: {
          include: {
            driver: {
              select: {
                id: true,
                username: true,
                carModel: true,
                carNumber: true
              }
            }
          }
        }
      }
    }) as OrderWithRelations;

    // Уведомляем всех водителей о новом заказе
    const notificationData = {
      orderId: order.id,
      fromAddress: order.fromAddress,
      toAddress: order.toAddress,
      price: order.price,
      pickupTime: order.pickupTime,
      comment: order.comment,
      passenger: order.passenger
    };

    io.emit('newOrder', notificationData);

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Could not create order'
    });
  }


}

// 🔹 Обновить заказ
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const id = req.params.id;
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Проверяем существование заказа
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      offers: true
    }
  });

  if (!existingOrder) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Проверяем права на обновление
  if (existingOrder.passengerId !== user.id) {
    res.status(403).json({ error: 'Not authorized to update this order' });
    return;
  }

  // Проверяем возможность обновления
  if (existingOrder.offers.length > 0) {
    res.status(400).json({ error: 'Cannot update order with existing offers' });
    return;
  }

  const result = updateOrderSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: result.error.issues
    });
    return;
  }

  const { price, comment } = result.data;

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(price && { price }),
        ...(comment && { comment })
      },
      include: {
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        driver: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            carModel: true,
            carNumber: true
          }
        },
        offers: {
          include: {
            driver: {
              select: {
                id: true,
                username: true,
                carModel: true,
                carNumber: true
              }
            }
          }
        }
      }
    }) as OrderWithRelations;

    // Уведомляем всех водителей об обновлении заказа
    io.emit('orderUpdated', {
      orderId: updated.id,
      price: updated.price,
      comment: updated.comment
    });

    res.json({
      success: true,
      order: updated
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'Could not update order'
    });
  }
};

// 🔹 Завершить заказ
export const completeOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const id = req.params.id;
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Проверяем существование заказа
  const existingOrder = await prisma.order.findUnique({
    where: { id }
  });

  if (!existingOrder) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Только водитель может завершить заказ
  if (existingOrder.driverId !== user.id) {
    res.status(403).json({ error: 'Only the driver can complete the order' });
    return;
  }

  // Проверяем статус заказа
  if (existingOrder.status !== OrderStatus.inProgress) {
    res.status(400).json({ error: 'Only in-progress orders can be completed' });
    return;
  }

  try {
    const completed = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.completed,
        completedAt: new Date()
      },
      include: {
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        driver: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            carModel: true,
            carNumber: true
          }
        }
      }
    }) as OrderWithRelations;

    // Уведомляем пассажира о завершении поездки
    io.to(`order_${completed.id}`).emit('orderCompleted', {
      orderId: completed.id,
      completedAt: completed.completedAt
    });

    res.json({
      success: true,
      order: completed
    });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({
      success: false,
      error: 'Could not complete order'
    });
  }
};

// 🔹 Сделать ценовое предложение
export const createPriceOffer = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const orderId = req.params.id;

  if (!user || user.role !== Role.driver) {
    res.status(401).json({ error: 'Unauthorized or invalid role' });
    return;
  }

  // Проверяем существование заказа
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      offers: {
        where: { driverId: user.id }
      }
    }
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Проверяем количество предложений от этого водителя
  if (order.offers.length >= 3) {
    res.status(400).json({ error: 'Maximum number of offers (3) reached' });
    return;
  }

  const result = createOfferSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      issues: result.error.issues
    });
    return;
  }

  const { price } = result.data;

  try {
    const offer = await prisma.priceOffer.create({
      data: {
        price,
        orderId,
        driverId: user.id,
        attempt: order.offers.length + 1
      },
      include: {
        driver: {
          select: {
            id: true,
            username: true,
            carModel: true,
            carNumber: true
          }
        }
      }
    });

    // Уведомляем пассажира о новом предложении
    io.to(`order_${orderId}`).emit('newOffer', {
      orderId,
      offer: {
        id: offer.id,
        price: offer.price,
        driver: offer.driver
      }
    });

    res.json({
      success: true,
      offer
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({
      success: false,
      error: 'Could not create offer'
    });
  }
};

// 🔹 Принять ценовое предложение
export const acceptOffer = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const orderId = req.params.id;
  const { offerId } = req.body;

  if (!user || user.role !== Role.passenger) {
    res.status(401).json({ error: 'Unauthorized or invalid role' });
    return;
  }

  try {
    // Проверяем существование заказа и предложения
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.passengerId !== user.id) {
      res.status(403).json({ error: 'Not authorized to accept offers for this order' });
      return;
    }

    const offer = order.offers.find(o => o.id === offerId);
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Обновляем заказ и предложение
    const [updatedOffer, updatedOrder] = await prisma.$transaction([
      prisma.priceOffer.update({
        where: { id: offerId },
        data: { status: 'accepted' }
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.accepted,
          driverId: offer.driverId,
          finalPrice: offer.price
        },
        include: {
          passenger: {
            select: {
              id: true,
              username: true,
              telegramId: true
            }
          },
          driver: {
            select: {
              id: true,
              username: true,
              telegramId: true,
              carModel: true,
              carNumber: true
            }
          }
        }
      })
    ]);

    // Отклоняем все остальные предложения
    await prisma.priceOffer.updateMany({
      where: {
        orderId,
        id: { not: offerId }
      },
      data: { status: 'rejected' }
    });

    // Уведомляем водителя о принятии предложения
    io.to(`user_${offer.driverId}`).emit('offerAccepted', {
      orderId,
      order: updatedOrder
    });

    // Уведомляем всех остальных водителей
    order.offers
      .filter(o => o.id !== offerId)
      .forEach(o => {
        io.to(`user_${o.driver.id}`).emit('offerRejected', {
          orderId,
          offerId: o.id
        });
      });

    res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({
      success: false,
      error: 'Could not accept offer'
    });
  }
};

// 🔹 Отклонить ценовое предложение
export const rejectOffer = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const orderId = req.params.id;
  const { offerId } = req.body;

  if (!user || user.role !== Role.passenger) {
    res.status(401).json({ error: 'Unauthorized or invalid role' });
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        offers: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.passengerId !== user.id) {
      res.status(403).json({ error: 'Not authorized to reject offers for this order' });
      return;
    }

    const offer = order.offers.find(o => o.id === offerId);
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    const updatedOffer = await prisma.priceOffer.update({
      where: { id: offerId },
      data: { status: 'rejected' },
      include: {
        driver: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    // Уведомляем водителя об отклонении предложения
    io.to(`user_${offer.driverId}`).emit('offerRejected', {
      orderId,
      offerId
    });

    res.json({
      success: true,
      offer: updatedOffer
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({
      success: false,
      error: 'Could not reject offer'
    });
  }
};

// 🔹 Начать поездку
export const startOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const id = req.params.id;

  if (!user || user.role !== Role.driver) {
    res.status(401).json({ error: 'Unauthorized or invalid role' });
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.driverId !== user.id) {
      res.status(403).json({ error: 'Not authorized to start this order' });
      return;
    }

    if (order.status !== OrderStatus.accepted) {
      res.status(400).json({ error: 'Order must be accepted before starting' });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.inProgress,
        startedAt: new Date()
      },
      include: {
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        driver: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            carModel: true,
            carNumber: true
          }
        }
      }
    }) as OrderWithRelations;

    // Уведомляем пассажира о начале поездки
    io.to(`order_${id}`).emit('orderStarted', {
      orderId: id,
      startedAt: updatedOrder.startedAt
    });

    res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error starting order:', error);
    res.status(500).json({
      success: false,
      error: 'Could not start order'
    });
  }
};

// 🗑 Отменить заказ
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const id = req.params.id;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        passenger: true,
        driver: true
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Проверяем права на отмену
    if (order.passengerId !== user.id && order.driverId !== user.id) {
      res.status(403).json({ error: 'Not authorized to cancel this order' });
      return;
    }

    // Проверяем возможность отмены
    if (order.status === OrderStatus.completed) {
      res.status(400).json({ error: 'Cannot cancel completed order' });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.cancelled,
        driverId: null // Убираем привязку к водителю
      },
      include: {
        passenger: {
          select: {
            id: true,
            username: true,
            telegramId: true
          }
        },
        driver: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            carModel: true,
            carNumber: true
          }
        }
      }
    }) as OrderWithRelations;

    // Уведомляем всех участников
    io.to(`order_${id}`).emit('orderCancelled', {
      orderId: id,
      cancelledBy: {
        id: user.id,
        role: user.role
      }
    });

    // Если заказ был принят, уведомляем водителя
    if (order.driverId) {
      io.to(`user_${order.driverId}`).emit('orderCancelled', {
        orderId: id,
        cancelledBy: {
          id: user.id,
          role: user.role
        }
      });
    }

    res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Could not cancel order'
    });
  }
};
