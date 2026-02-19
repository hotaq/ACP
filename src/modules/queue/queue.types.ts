import { z } from 'zod';

export const QueueMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.union([z.string(), z.literal('broadcast')]),
  type: z.enum(['request', 'response', 'notification']),
  payload: z.unknown(),
  priority: z.enum(['low', 'normal', 'high']),
  timestamp: z.date(),
  delivered: z.boolean().optional(),
});

export type QueueMessage = z.infer<typeof QueueMessageSchema>;
