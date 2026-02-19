import { z } from 'zod';

export const SendMessageSchema = z.object({
  to: z.union([z.string().min(1), z.literal('broadcast')]),
  type: z.enum(['request', 'response', 'notification']),
  payload: z.unknown(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  threadId: z.string().optional(),
  parentMessageId: z.string().optional(),
});

export const GetMessagesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(['request', 'response', 'notification']).optional(),
  delivered: z.enum(['true', 'false']).optional(),
  read: z.enum(['true', 'false']).optional(),
  threadId: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;
