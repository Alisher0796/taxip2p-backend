import { User } from "@prisma/client"; // Это твой тип пользователя из Prisma

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
