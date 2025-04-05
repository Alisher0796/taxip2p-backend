import { Role } from '@prisma/client'

export interface AuthUser {
  id: string
  username: string
  telegramId: string
  role: Role
  carModel?: string | null
  carNumber?: string | null
  createdAt: Date
  updatedAt: Date
  offerCount: number
}

export interface TelegramAuthData {
  id: string
  first_name: string
  username?: string
  auth_date: number
  hash: string
  role?: Role
  carModel?: string | null
  carNumber?: string | null
}

export interface AuthResponse {
  success: boolean
  user: AuthUser
  token: string
  error?: string
}
