import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '@config/index';
import { ClientToServerEvents, ServerToClientEvents, SocketIOServer, SocketIOSocket } from './types/socket';

let io: SocketIOServer;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: config.cors.origins,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders
    },
    pingTimeout: config.websocket.pingTimeout,
    pingInterval: config.websocket.pingInterval,
    maxHttpBufferSize: config.websocket.maxBufferSize
  });

  io.on('connection', (socket: SocketIOSocket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (orderId: string) => {
      socket.join(`order_${orderId}`);
      console.log(`Client ${socket.id} joined order_${orderId}`);
    });

    socket.on('leave', (orderId: string) => {
      socket.leave(`order_${orderId}`);
      console.log(`Client ${socket.id} left order_${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export { io };
