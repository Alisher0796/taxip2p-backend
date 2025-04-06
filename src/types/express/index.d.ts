import 'express';
import { AuthUser as BaseAuthUser } from '../auth.types';

export type AuthUser = BaseAuthUser;

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
