import { Order, PriceOffer, User, OrderStatus as PrismaOrderStatus, PickupTime as PrismaPickupTime } from '@prisma/client';
import { Socket } from 'socket.io';

export type PickupTime = PrismaPickupTime;
export type OrderStatus = PrismaOrderStatus;

export interface OrderSocket extends Socket {
  auth: {
    token: string;
    userId?: string;
  };
}

export interface OrderError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface CreateOrderDTO {
  fromAddress: string;
  toAddress: string;
  price?: number;
  comment?: string;
  pickupTime?: PickupTime;
}

export interface UpdateOrderDTO {
  fromAddress?: string;
  toAddress?: string;
  price?: number;
  comment?: string;
  pickupTime?: PickupTime;
}

export interface CreatePriceOfferDTO {
  price: number;
  comment?: string;
  expiresAt?: Date;
}

export interface OrderResponse {
  id: string;
  status: OrderStatus;
  fromAddress: string;
  toAddress: string;
  price?: number;
  comment?: string;
  pickupTime?: PickupTime;
  passenger: {
    id: string;
    username: string;
  };
  driver?: {
    id: string;
    username: string;
    carModel?: string;
    carNumber?: string;
  };
  offers?: PriceOfferResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceOfferResponse {
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
}

export interface OrderWithRelations extends Order {
  passenger: User;
  driver?: User | null;
  offers?: PriceOffer[];
}

export interface OrderError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
