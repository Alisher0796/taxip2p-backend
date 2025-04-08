import { createClient, RedisClientType } from 'redis';

// Создаем пустой объект для случая, когда Redis недоступен
const nullRedis: any = {
  get: async () => null,
  set: async () => {},
  setEx: async () => {},
  del: async () => {},
};

// Пытаемся создать реального клиента Redis
let redisClient: RedisClientType | any;

try {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
    // При ошибке подключения используем нулевую реализацию
    redisClient = nullRedis;
  });

  redisClient.on('connect', () => console.log('Redis Client Connected'));

  // Подключаемся к Redis
  redisClient.connect().catch((err: Error) => {
    console.error('Redis Connection Error:', err);
    // При ошибке подключения используем нулевую реализацию
    redisClient = nullRedis;
  });
} catch (e) {
  console.log('Redis not available, using null implementation');
  redisClient = nullRedis;
}

export const redis = redisClient;
