export interface OrderModel {
    id: string
    passengerId: string
    driverId?: string
    price: number
    status: 'pending' | 'confirmed' | 'completed'
    createdAt: Date
  }
  