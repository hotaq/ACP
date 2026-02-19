import { z } from 'zod';

export const RegisterAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['claude-code', 'opencode', 'custom']),
  capabilities: z.array(z.string()).default([]),
  endpoint: z.string().url(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capabilities: z.array(z.string()).optional(),
  endpoint: z.string().url().optional(),
  status: z.enum(['online', 'offline', 'busy']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
