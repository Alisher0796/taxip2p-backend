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

const CLIENT_URL = process.env.CLIENT_URL || '*'

// 💬 WebSocket
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['x-telegram-id'], // ✅ разрешаем custom-заголовок
  },
})

export const prisma = new PrismaClient()

// ✅ CORS middleware для REST API
app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id'], // ✅ здесь тоже
  credentials: true,
}))

app.use(express.json())

// 📦 API Роуты
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/auth', authRoutes)

// 🧪 Test route
app.get('/', (req, res) => {
  res.send('🚀 TaxiP2P backend работает! CORS настроен!')
})

// 🔌 WebSocket подключение
setupSocket(io)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
