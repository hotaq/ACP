import { Request, Response, NextFunction } from 'express';
import { verifySoul, extractSoulFromHeader, isApiKey, hashApiKey } from '../utils/soul.js';
import { agentService } from '../modules/agent/agent.service.js';
import logger from '../utils/logger.js';
import type { Agent, SoulPayload } from '../types/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
      soulPayload?: SoulPayload;
    }
  }
}

export const soulAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check X-API-Key header first, then Authorization header
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const authHeader = req.headers.authorization;

    let token: string | undefined = apiKeyHeader;

    if (!token && authHeader) {
      token = extractSoulFromHeader(authHeader) ?? undefined;
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Provide an API key (X-API-Key header) or Soul token (Authorization header)',
      });
      return;
    }

    let agent: Agent | null = null;
    let payload: SoulPayload | null = null;

    // Check if it's an API key
    if (isApiKey(token)) {
      const apiKeyHash = hashApiKey(token);
      agent = await agentService.findByApiKeyHash(apiKeyHash);

      if (!agent) {
        res.status(401).json({
          error: 'Invalid API key',
        });
        return;
      }
    } else {
      // Verify soul token
      payload = verifySoul(token);

      if (!payload) {
        res.status(401).json({
          error: 'Invalid or expired Soul token',
        });
        return;
      }

      // Get agent from database
      agent = await agentService.findById(payload.agentId);

      if (!agent) {
        res.status(401).json({
          error: 'Agent not found',
        });
        return;
      }
    }

    // Attach agent and payload to request
    req.agent = agent;
    if (payload) {
      req.soulPayload = payload;
    }

    // Update last seen
    await agentService.updateLastSeen(agent.id);

    next();
  } catch (error) {
    logger.error('Soul authentication error', { error });
    res.status(500).json({
      error: 'Authentication failed',
    });
  }
};

export const optionalSoulAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const authHeader = req.headers.authorization;

    let token: string | undefined = apiKeyHeader;

    if (!token && authHeader) {
      token = extractSoulFromHeader(authHeader) ?? undefined;
    }

    if (!token) {
      next();
      return;
    }

    let agent: Agent | null = null;
    let payload: SoulPayload | null = null;

    if (isApiKey(token)) {
      const apiKeyHash = hashApiKey(token);
      agent = await agentService.findByApiKeyHash(apiKeyHash);
    } else {
      payload = verifySoul(token);

      if (payload) {
        agent = await agentService.findById(payload.agentId);
      }
    }

    if (agent) {
      req.agent = agent;
      if (payload) {
        req.soulPayload = payload;
      }
      await agentService.updateLastSeen(agent.id);
    }

    next();
  } catch {
    next();
  }
};
