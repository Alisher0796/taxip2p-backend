import { z } from 'zod'

export const createOrderSchema = z.object({
  price: z.number().min(1, 'Цена должна быть больше 0')
})

export const updateOrderSchema = z.object({
  price: z.number().min(1, 'Цена должна быть больше 0')
})
