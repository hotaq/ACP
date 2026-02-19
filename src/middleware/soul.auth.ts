import { Request, Response, NextFunction } from 'express';
import { verifySoul, extractSoulFromHeader } from '../utils/soul.js';
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
    // Get soul token from header
    const authHeader = req.headers.authorization;
    const soulToken = extractSoulFromHeader(authHeader);

    if (!soulToken) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Provide a valid Soul token in the Authorization header',
      });
      return;
    }

    // Verify soul token
    const payload = verifySoul(soulToken);

    if (!payload) {
      res.status(401).json({
        error: 'Invalid or expired Soul token',
      });
      return;
    }

    // Get agent from database
    const agent = await agentService.findById(payload.agentId);

    if (!agent) {
      res.status(401).json({
        error: 'Agent not found',
      });
      return;
    }

    // Attach agent and payload to request
    req.agent = agent;
    req.soulPayload = payload;

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
    const authHeader = req.headers.authorization;
    const soulToken = extractSoulFromHeader(authHeader);

    if (soulToken) {
      const payload = verifySoul(soulToken);

      if (payload) {
        const agent = await agentService.findById(payload.agentId);

        if (agent) {
          req.agent = agent;
          req.soulPayload = payload;
          await agentService.updateLastSeen(agent.id);
        }
      }
    }

    next();
  } catch {
    // For optional auth, just continue without authentication
    next();
  }
};
