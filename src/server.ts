import express from 'express'
import http from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

import orderRoutes from './routes/order.routes'
import userRoutes from './routes/user.routes'
import messageRoutes from './routes/message.routes'
import authRoutes from './routes/auth.routes'
import { setupSocket } from './sockets/socket'

dotenv.config()

const app = express()
const server = http.createServer(app)

const allowedOrigins = [
  'https://taxip2p-frontend.vercel.app',
  'https://taxip2p-frontend-gp43xwdtr-alishers-projects-e810444a.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:56277',
  'http://127.0.0.1:56277'
]

console.log('[CORS] Разрешённые источники:', allowedOrigins)

export const prisma = new PrismaClient()

// ✅ CORS для REST API
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log('[CORS] Блокирован origin:', origin)
      callback(new Error('CORS origin not allowed'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-telegram-id',
    'x-telegram-username',
    'x-telegram-init-data'
  ],
  credentials: true
}))

app.use(express.json())

// 📦 API
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/auth', authRoutes)

// ✅ Корень
app.get('/', (req, res) => {
  res.send('🚀 TaxiP2P backend работает! CORS точно работает!')
})

// ✅ WebSocket
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['x-telegram-id', 'x-telegram-init-data'] // 👈 добавляем init-data
  }
})

setupSocket(io)

const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
