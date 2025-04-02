import { z } from 'zod'

export const createMessageSchema = z.object({
  orderId: z.string().uuid(),
  text: z.string().min(1, 'Сообщение не может быть пустым')
})
