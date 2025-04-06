import { AuthUser } from '../middleware/auth.middleware'
import { Server } from 'socket.io'

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }

    interface Application {
      locals: {
        io: Server
      }
    }
  }
}
