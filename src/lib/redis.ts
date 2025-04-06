import { createClient, RedisClientType } from 'redis';

export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err: Error) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis Client Connected'));

// Подключаемся к Redis
redis.connect().catch((err: Error) => console.error('Redis Connection Error:', err));
