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

import { config } from './config'

console.log('[CORS] Разрешённые источники:', config.cors.origins)

export const prisma = new PrismaClient()

// ✅ CORS для REST API
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, true)
    } else {
      console.log('[CORS] Блокирован origin:', origin)
      callback(new Error('CORS origin not allowed'))
    }
  },
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
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
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: config.cors.allowedHeaders
  }
})

setupSocket(io)

const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
