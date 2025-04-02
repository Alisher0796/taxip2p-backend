export interface UserModel {
    id: string
    username: string
    role: 'driver' | 'passenger'
    createdAt: Date
  }
  