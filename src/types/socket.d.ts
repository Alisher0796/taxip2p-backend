import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io'

import { Role } from '@prisma/client'

interface SocketData {
  user?: {
    id: string
    role: Role
  }
}

declare module 'socket.io' {
  interface Socket extends SocketIOSocket {
    data: SocketData
  }
}

export { SocketData }
