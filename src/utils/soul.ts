import crypto from 'crypto';
import { config, getSoulExpiryMs } from '../config/index.js';
import type { SoulPayload, Agent } from '../types/index.js';

export const generateSoul = (agent: Agent): string => {
  const now = Date.now();
  const payload: SoulPayload = {
    agentId: agent.id,
    name: agent.name,
    capabilities: agent.capabilities,
    iat: now,
    exp: now + getSoulExpiryMs(),
  };

  const payloadStr = JSON.stringify(payload);
  const signature = signPayload(payloadStr);

  // Format: base64(payload).signature
  const encodedPayload = Buffer.from(payloadStr).toString('base64url');
  return `${encodedPayload}.${signature}`;
};

export const verifySoul = (soul: string): SoulPayload | null => {
  try {
    const parts = soul.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, signature] = parts;
    const payloadStr = Buffer.from(encodedPayload, 'base64url').toString();

    // Verify signature
    const expectedSignature = signPayload(payloadStr);
    if (signature !== expectedSignature) {
      return null;
    }

    const payload: SoulPayload = JSON.parse(payloadStr);

    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const hashSoul = (soul: string): string => {
  return crypto
    .createHash('sha256')
    .update(soul)
    .digest('hex');
};

const signPayload = (payload: string): string => {
  return crypto
    .createHmac('sha256', config.soulSecret)
    .update(payload)
    .digest('hex');
};

export const extractSoulFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  // Support "Bearer <soul>" or just "<soul>"
  const parts = authHeader.split(' ');
  return parts.length === 2 ? parts[1] : parts[0];
};
