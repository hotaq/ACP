import { Request, Response, NextFunction } from 'express';
import { agentService } from './agent.service.js';
import { RegisterAgentSchema, UpdateAgentSchema } from './agent.types.js';
import { generateApiKey, hashApiKey } from '../../utils/auth.js';
import logger from '../../utils/logger.js';
import type { Agent } from '../../types/index.js';

declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
    }
  }
}

export class AgentController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = RegisterAgentSchema.parse(req.body);

      const existingAgent = await agentService.findByName(validatedInput.name);
      if (existingAgent) {
        res.status(409).json({
          error: 'Agent with this name already exists',
        });
        return;
      }

      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      const { agent } = await agentService.register(validatedInput, apiKeyHash);

      logger.info('Agent registered', { agentId: agent.id, name: agent.name });

      res.status(201).json({
        agent,
        apiKey,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { capability, status } = req.query;

      let agents;
      if (capability && typeof capability === 'string') {
        agents = await agentService.findByCapability(capability);
      } else if (status && typeof status === 'string') {
        agents = await agentService.findByStatus(status);
      } else {
        agents = await agentService.findAll();
      }

      res.json({ agents });
    } catch (error) {
      next(error);
    }
  }

  async getAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const agent = await agentService.findById(id);

      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      res.json({ agent });
    } catch (error) {
      next(error);
    }
  }

  async updateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validatedInput = UpdateAgentSchema.parse(req.body);

      const agent = await agentService.update(id, validatedInput);

      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      logger.info('Agent updated', { agentId: agent.id });

      res.json({ agent });
    } catch (error) {
      next(error);
    }
  }

  async deleteAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const deleted = await agentService.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      logger.info('Agent deleted', { agentId: id });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      res.json({ agent: req.agent });
    } catch (error) {
      next(error);
    }
  }

  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Update lastSeen AND set status to online
      await agentService.updateStatus(req.agent.id, 'online');

      res.json({ status: 'ok', online: true, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [total, online, offline, busy] = await Promise.all([
        agentService.count(),
        agentService.countByStatus('online'),
        agentService.countByStatus('offline'),
        agentService.countByStatus('busy'),
      ]);

      res.json({
        total,
        byStatus: { online, offline, busy },
      });
    } catch (error) {
      next(error);
    }
  }

  // Friend methods
  async sendFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { agentId } = req.body;
      if (!agentId) {
        res.status(400).json({ error: 'agentId is required' });
        return;
      }

      const result = await agentService.sendFriendRequest(req.agent.id, agentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async acceptFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const agentId = req.params.id as string;
      const result = await agentService.acceptFriendRequest(req.agent.id, agentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const agentId = req.params.id as string;
      const result = await agentService.rejectFriendRequest(req.agent.id, agentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async removeFriend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const agentId = req.params.id as string;
      const result = await agentService.removeFriend(req.agent.id, agentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const friends = await agentService.getFriends(req.agent.id);
      res.json({ friends });
    } catch (error) {
      next(error);
    }
  }

  async getPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const requests = await agentService.getPendingRequests(req.agent.id);
      res.json({ pendingRequests: requests });
    } catch (error) {
      next(error);
    }
  }

  async setAllowAllMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { allow } = req.body;
      await agentService.setAllowAllMessages(req.agent.id, allow);
      res.json({ ok: true, allowAllMessages: allow });
    } catch (error) {
      next(error);
    }
  }

  async regenerateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const newApiKey = generateApiKey();
      const newApiKeyHash = hashApiKey(newApiKey);

      await agentService.regenerateApiKey(req.agent.id, newApiKeyHash);

      logger.info('API key regenerated', { agentId: req.agent.id });

      res.json({ apiKey: newApiKey });
    } catch (error) {
      next(error);
    }
  }
}

export const agentController = new AgentController();
