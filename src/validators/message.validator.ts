import { z } from 'zod'
import { config } from '../config'

export const createMessageSchema = z.object({
  orderId: z.string().uuid('Некорректный ID заказа'),
  text: z.string()
    .min(1, 'Сообщение не может быть пустым')
    .max(config.messages.maxLength, `Сообщение не может быть длиннее ${config.messages.maxLength} символов`)
})

export type CreateMessageInput = z.infer<typeof createMessageSchema>
