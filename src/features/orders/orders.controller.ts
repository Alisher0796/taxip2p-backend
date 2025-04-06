import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { OrderService } from './orders.service';
import { canManageOrder, canCreatePriceOffer } from './orders.utils';
import { OrderError } from './orders.types';
import { OrderStatus } from '@prisma/client';
import { emitOrderEvent } from './orders.socket';

export class OrderController {
  constructor(
    private orderService: OrderService
  ) {}

  createOrder = async (req: Request, res: Response): Promise<void> => {
    const { fromAddress, toAddress, price, comment, pickupTime } = req.body;
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const order = await this.orderService.createOrder(
        { fromAddress, toAddress, price, comment, pickupTime },
        userId
      );
      
      // Notify all connected clients about new order
      emitOrderEvent(req.app.locals.io, 'newOrder', order);
      
      res.status(201).json(order);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);

      if (!canManageOrder(req.user!, order.passenger.id)) {
        res.status(403).json({ error: 'Not authorized to update this order' });
        return;
      }

      const { price, comment, pickupTime } = req.body;
      const updatedOrder = await this.orderService.updateOrder(id, { price, comment, pickupTime });
      
      // Notify room about order update
      emitOrderEvent(req.app.locals.io, 'orderUpdated', updatedOrder, `order_${id}`);
      
      res.json(updatedOrder);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  createPriceOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId || !canCreatePriceOffer(req.user!)) {
        res.status(403).json({ error: 'Not authorized to create offers' });
        return;
      }

      const { price, comment, expiresAt } = req.body;
      const order = await this.orderService.createPriceOffer(
        orderId,
        { price, comment, expiresAt },
        userId
      );
      
      // Notify room about new offer
      const latestOffer = order.offers![order.offers!.length - 1];
      emitOrderEvent(req.app.locals.io, 'newOffer', {
        orderId,
        offer: {
          id: latestOffer.id,
          price: latestOffer.price,
          comment: latestOffer.comment || undefined,
          driver: {
            id: latestOffer.driver.id,
            username: latestOffer.driver.username,
            carModel: latestOffer.driver.carModel || undefined,
            carNumber: latestOffer.driver.carNumber || undefined
          },
          createdAt: latestOffer.createdAt,
          expiresAt: latestOffer.expiresAt || undefined
        }
      }, `order_${orderId}`);
      
      res.status(201).json(order);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  acceptOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { offerId } = req.body;
      const order = await this.orderService.getOrderById(id);

      if (!canManageOrder(req.user!, order.passenger.id)) {
        res.status(403).json({ error: 'Not authorized to accept offers for this order' });
        return;
      }

      const updatedOrder = await this.orderService.acceptOffer(id, offerId);
      
      // Notify about accepted offer
      emitOrderEvent(req.app.locals.io, 'offerAccepted', {
        orderId: id,
        offerId,
        driver: {
          id: updatedOrder.driver!.id,
          username: updatedOrder.driver!.username,
          carModel: updatedOrder.driver!.carModel || undefined,
          carNumber: updatedOrder.driver!.carNumber || undefined
        }
      }, `order_${id}`);
      
      res.json(updatedOrder);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  updateOrderStatus = async (req: Request<{ id: string }, any, { status: OrderStatus }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await this.orderService.getOrderById(id);

      if (!canManageOrder(req.user!, order.passenger.id) && req.user!.id !== order.driver?.id) {
        res.status(403).json({ error: 'Not authorized to update this order status' });
        return;
      }

      const updatedOrder = await this.orderService.updateOrderStatus(
        id,
        status,
        { id: req.user!.id, role: req.user!.role }
      );
      
      // Notify about status change
      emitOrderEvent(req.app.locals.io, 'statusUpdated', {
        orderId: id,
        status: updatedOrder.status
      }, `order_${id}`);
      
      res.json(updatedOrder);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);
      res.json(order);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getActiveOrders = async (_req: Request, res: Response): Promise<void> => {
    try {
      const orders = await this.orderService.getActiveOrders();
      res.json(orders);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    console.error('Order operation failed:', error);
    
    if (this.isOrderError(error)) {
      switch (error.code) {
        case 'ORDER_NOT_FOUND':
        case 'OFFER_NOT_FOUND':
          res.status(404).json({ error: error.message });
          break;
        case 'INVALID_STATUS':
        case 'INVALID_TRANSITION':
        case 'MAX_OFFERS_REACHED':
          res.status(400).json({ error: error.message });
          break;
        default:
          res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private isOrderError(error: unknown): error is OrderError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    );
  }
}
