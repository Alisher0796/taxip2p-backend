import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  botToken: process.env.BOT_TOKEN || '',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/taxip2p',
  cors: {
    origins: [process.env.CLIENT_URL || 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data']
  },
  messages: {
    maxLength: 500, // Максимальная длина сообщения
    pageSize: 20,   // Количество сообщений на странице
  },
  orders: {
    maxActiveOrders: 3,    // Максимальное количество активных заказов
    maxOffersPerOrder: 5,  // Максимальное количество предложений на заказ
    minPrice: 500,         // Минимальная цена в KZT
    maxPrice: 50000,       // Максимальная цена в KZT
    offerExpirationTime: 5 * 60 * 1000, // 5 минут на принятие предложения
  }
};
