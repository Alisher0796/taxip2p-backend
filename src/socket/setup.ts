import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { setupOrderSocket } from '../features/orders/orders.socket';

export function setupSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io'
  });

  // Set up authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // TODO: Verify token and attach user data to socket
    // This should be implemented based on your authentication system
    next();
  });

  // Set up order socket handlers
  setupOrderSocket(io);

  return io;
}
