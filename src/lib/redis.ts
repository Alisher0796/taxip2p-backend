import { createClient, RedisClientType } from 'redis';

// Создаем интерфейс для нашего Redis клиента
interface RedisInterface {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<any>;
  setEx: (key: string, ttl: number, value: string) => Promise<any>;
  del: (key: string) => Promise<any>;
  isConnected: () => boolean;
  connect: () => Promise<void>;
}

// Нулевая реализация Redis
class NullRedis implements RedisInterface {
  async get() { return null; }
  async set() { return; }
  async setEx() { return; }
  async del() { return; }
  isConnected() { return false; }
  async connect() { return; }
}

// Обертка над настоящим Redis клиентом
class RedisWrapper implements RedisInterface {
  private client: RedisClientType | null = null;
  private connected: boolean = false;
  private connectionAttempted: boolean = false;
  
  constructor(url: string) {
    try {
      this.client = createClient({ url });
      this.setupListeners();
    } catch (error) {
      console.log('Error creating Redis client: Using null implementation');
      this.client = null;
      this.connected = false;
      this.connectionAttempted = true;
    }
  }
  
  private setupListeners() {
    if (!this.client) return;
    
    this.client.on('error', (err) => {
      // Логируем ошибку только один раз
      if (this.connected || !this.connectionAttempted) {
        console.log('Redis connection error, falling back to null implementation');
      }
      this.connected = false;
    });
    
    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });
  }
  
  async connect() {
    if (this.connectionAttempted || !this.client) return;
    
    try {
      this.connectionAttempted = true;
      await this.client.connect();
    } catch (error) {
      console.log('Failed to connect to Redis: Using null implementation');
      this.connected = false;
    }
  }
  
  async get(key: string): Promise<string | null> {
    if (!this.connected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      return null;
    }
  }
  
  async set(key: string, value: string): Promise<any> {
    if (!this.connected || !this.client) return;
    try {
      return await this.client.set(key, value);
    } catch (error) {
      // Игнорируем ошибки
    }
  }
  
  async setEx(key: string, ttl: number, value: string): Promise<any> {
    if (!this.connected || !this.client) return;
    try {
      return await this.client.setEx(key, ttl, value);
    } catch (error) {
      // Игнорируем ошибки
    }
  }
  
  async del(key: string): Promise<any> {
    if (!this.connected || !this.client) return;
    try {
      return await this.client.del(key);
    } catch (error) {
      // Игнорируем ошибки
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}

// Создаем клиент с учетом окружения
let redisClient: RedisInterface;

// Используем обертку только если есть REDIS_URL
if (process.env.REDIS_URL) {
  console.log('Redis URL found, attempting connection...');
  redisClient = new RedisWrapper(process.env.REDIS_URL);
  // Инициируем подключение, но не ждем результата
  redisClient.connect().catch(() => {});
} else {
  console.log('No Redis URL found, using null implementation');
  redisClient = new NullRedis();
}

export const redis = redisClient;
