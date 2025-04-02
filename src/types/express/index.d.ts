import 'express';

export interface AuthUser {
  id: string;
  role: 'passenger' | 'driver';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
