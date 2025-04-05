import crypto from 'crypto';
import { config } from '../config';

const botToken = config.botToken;
if (!botToken) {
  throw new Error('BOT_TOKEN environment variable is not set');
}

export interface TelegramInitData {
  query_id: string;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}

export const verifyTelegramWebAppData = (initData: string): TelegramInitData | null => {
  try {
    // Разбираем строку initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDate = params.get('auth_date');

    if (!hash || !authDate) {
      console.error('Missing hash or auth_date in initData');
      return null;
    }

    // Проверяем время жизни auth_date
    const authTimestamp = parseInt(authDate) * 1000;
    const now = Date.now();
    if (now - authTimestamp > config.security.telegramAuthTTL) {
      console.error('Telegram auth data expired');
      return null;
    }

    params.delete('hash');

    // Сортируем параметры
    const pairs = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);

    // Создаем data-check-string
    const dataCheckString = pairs.join('\n');

    // Создаем HMAC-SHA256
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hmac !== hash) {
      console.error('Invalid Telegram hash');
      return null;
    }

    // Парсим данные пользователя
    const user = JSON.parse(params.get('user') || '{}');
    return {
      query_id: params.get('query_id') || '',
      user,
      auth_date: parseInt(authDate),
      hash
    };
  } catch (error) {
    console.error('Telegram WebApp verification error:', error);
    return null;
  }
};
