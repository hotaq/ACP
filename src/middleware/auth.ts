import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, isApiKey, hashApiKey } from '../utils/auth.js';
import { agentService } from '../modules/agent/agent.service.js';
import logger from '../utils/logger.js';
import type { Agent } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
    }
  }
}

export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const authHeader = req.headers.authorization;

    let token: string | undefined = apiKeyHeader;

    if (!token && authHeader) {
      token = extractTokenFromHeader(authHeader) ?? undefined;
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Provide an API key via X-API-Key header or Authorization: Bearer',
      });
      return;
    }

    if (!isApiKey(token)) {
      res.status(401).json({
        error: 'Invalid API key format',
        message: 'API key must start with "acp_live_"',
      });
      return;
    }

    const apiKeyHash = hashApiKey(token);
    const agent = await agentService.findByApiKeyHash(apiKeyHash);

    if (!agent) {
      res.status(401).json({
        error: 'Invalid API key',
      });
      return;
    }

    req.agent = agent;
    await agentService.updateLastSeen(agent.id);

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({
      error: 'Authentication failed',
    });
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const authHeader = req.headers.authorization;

    let token: string | undefined = apiKeyHeader;

    if (!token && authHeader) {
      token = extractTokenFromHeader(authHeader) ?? undefined;
    }

    if (!token || !isApiKey(token)) {
      next();
      return;
    }

    const apiKeyHash = hashApiKey(token);
    const agent = await agentService.findByApiKeyHash(apiKeyHash);

    if (agent) {
      req.agent = agent;
      await agentService.updateLastSeen(agent.id);
    }

    next();
  } catch {
    next();
  }
};
