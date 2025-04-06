import { Server, Socket } from 'socket.io';
import { OrderResponse } from './orders.types';

export type OrderEvent = {
  newOrder: OrderResponse;
  orderUpdated: OrderResponse;
  newOffer: {
    orderId: string;
    offer: {
      id: string;
      price: number;
      comment?: string;
      driver: {
        id: string;
        username: string;
        carModel?: string;
        carNumber?: string;
      };
      createdAt: Date;
      expiresAt?: Date;
    };
  };
  offerAccepted: {
    orderId: string;
    offerId: string;
    driver: {
      id: string;
      username: string;
      carModel?: string;
      carNumber?: string;
    };
  };
  statusUpdated: {
    orderId: string;
    status: string;
  };
};

export function setupOrderSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    // Join order room when client subscribes
    socket.on('subscribeToOrder', (orderId: string) => {
      socket.join(`order_${orderId}`);
    });

    // Leave order room when client unsubscribes
    socket.on('unsubscribeFromOrder', (orderId: string) => {
      socket.leave(`order_${orderId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Clean up any subscriptions if needed
    });
  });
}

export function emitOrderEvent<T extends keyof OrderEvent>(
  io: Server,
  event: T,
  data: OrderEvent[T],
  room?: string
): void {
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}
