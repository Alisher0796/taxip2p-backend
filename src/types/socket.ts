import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export interface ServerToClientEvents {
  messageError: (error: { error: string }) => void;
  orderUpdated: (data: { orderId: string; order: { id: string; status: string; price?: number; driverId?: string; driver?: any }; updatedBy?: { id: string; role: string }; timestamp: string }) => void;
  offerCreated: (data: { orderId: string; offer: { id: string; price: number; driverId: string; driver: any } }) => void;
  offerAccepted: (data: { orderId: string; order: { id: string; status: string; price?: number; driverId?: string; driver?: any }; timestamp: string }) => void;
  offerRejected: (data: { orderId: string; offerId: string; timestamp: string }) => void;
  orderStarted: (data: { orderId: string; startedAt: Date }) => void;
  orderCompleted: (data: { orderId: string; completedAt: Date }) => void;
  orderCancelled: (data: { orderId: string; cancelledBy: { id: string; role: string } }) => void;
  newOrder: (order: { id: string; status: string; price?: number; fromAddress: string; toAddress: string; pickupTime: string }) => void;
}

export interface ClientToServerEvents {
  join: (orderId: string) => void;
  leave: (orderId: string) => void;
}

export type SocketIOServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type SocketIOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface SocketConfig {
  pingTimeout: number;
  pingInterval: number;
  maxBufferSize: number;
}
