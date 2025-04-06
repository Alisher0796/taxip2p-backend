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
    photo_url?: string;
    allows_write_to_pm?: boolean;
  };
  auth_date: number;
  hash: string;
}

export const verifyTelegramWebAppData = (initData: string): TelegramInitData | null => {
  try {
    console.log('[Telegram] Verifying initData:', initData);
    const params = new URLSearchParams(initData);
    console.log('[Telegram] Parsed params:', Object.fromEntries(params.entries()));

    const receivedHash = params.get('hash');
    if (!receivedHash) {
      console.error('[Telegram] Missing hash');
      return null;
    }

    // Удаляем hash перед генерацией подписи
    params.delete('hash');

    // Строим data_check_string (строго по алфавиту)
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Генерируем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Считаем HMAC
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Подробный лог валидации
    console.log('[Telegram] Validation details:', {
      secretKey: secretKey.toString('hex'),
      dataCheckString,
      calculatedHash,
      receivedHash,
      match: calculatedHash === receivedHash,
    });

    if (calculatedHash !== receivedHash) {
      console.warn('[Telegram] Invalid hash');
      return null;
    }

    const userStr = params.get('user');
    const queryId = params.get('query_id');
    const authDateStr = params.get('auth_date');

    if (!userStr || !queryId || !authDateStr) {
      console.warn('[Telegram] Missing required fields');
      return null;
    }

    let user;
    try {
      user = JSON.parse(userStr);
    } catch (err) {
      console.error('[Telegram] Failed to parse user JSON:', err);
      return null;
    }

    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) {
      console.error('[Telegram] Invalid auth_date');
      return null;
    }

    return {
      query_id: queryId,
      user,
      auth_date: authDate,
      hash: receivedHash,
    };
  } catch (error) {
    console.error('Telegram WebApp verification error:', error);
    return null;
  }
};
