import { Request, Response, NextFunction } from 'express';
import { messageService } from './message.service.js';
import { GetMessagesQuerySchema } from './message.types.js';
import { MessageModel } from '../../db/models/message.model.js';
import { agentService } from '../agent/agent.service.js';
import { getSocketHandler } from '../../server.js';
import logger from '../../utils/logger.js';

export class MessageController {
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { to, text, type } = req.body;

      // Minimal validation
      if (!to || !text) {
        res.status(400).json({ error: 'to and text are required' });
        return;
      }

      // Check if broadcast (allowed for all)
      if (to !== 'broadcast') {
        // Check if friends
        const areFriends = await agentService.areFriends(req.agent.id, to);
        if (!areFriends) {
          res.status(403).json({ error: 'Not friends. Send a friend request first.' });
          return;
        }
      }

      // Auto-generate threadId based on agent pair
      const threadId = `${req.agent.id}-${to}`;

      // Find last message in this thread to set parentMessageId
      const lastMessage = await MessageModel.findOne({
        $or: [
          { from: req.agent.id, to: to },
          { from: to, to: req.agent.id }
        ]
      }).sort({ timestamp: -1 });

      // Create message with auto-threading
      const message = await messageService.create(req.agent.id, {
        to,
        type: type || 'notification',
        payload: { text },
        priority: 'normal',
        threadId,
        parentMessageId: lastMessage?.id || undefined,
      });

      try {
        const socketHandler = getSocketHandler();
        await socketHandler.deliverMessage(message);
      } catch {
        // Delivered on reconnect
      }

      logger.info('Message sent', {
        messageId: message.id,
        from: req.agent.id,
        to: message.to,
        threadId: message.threadId,
      });

      // Return minimal response
      res.status(201).json({
        ok: true,
        id: message.id,
        threadId: message.threadId,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const validatedQuery = GetMessagesQuerySchema.parse(req.query);
      
      const messages = await messageService.findMessagesForAgent(req.agent.id, {
        limit: validatedQuery.limit ? parseInt(validatedQuery.limit as string, 10) : undefined,
        offset: validatedQuery.offset ? parseInt(validatedQuery.offset as string, 10) : undefined,
        undeliveredOnly: validatedQuery.delivered === 'false',
        unreadOnly: validatedQuery.read === 'false',
      });

      res.json({ messages });
    } catch (error) {
      next(error);
    }
  }

  async getMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = req.params.id as string;
      const message = await messageService.findById(id);

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      if (message.from !== req.agent.id && message.to !== req.agent.id && message.to !== 'broadcast') {
        res.status(403).json({ error: 'Not authorized to view this message' });
        return;
      }

      res.json({ message });
    } catch (error) {
      next(error);
    }
  }

  async getMyMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { undelivered, unread, limit, offset } = req.query;
      const messages = await messageService.findMessagesForAgent(req.agent.id, {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        undeliveredOnly: undelivered === 'true',
        unreadOnly: unread === 'true',
      });

      res.json({ messages });
    } catch (error) {
      next(error);
    }
  }

  async getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const threadId = req.params.threadId as string;
      const messages = await messageService.findThread(threadId);

      const hasAccess = messages.some(
        (msg) => msg.from === req.agent?.id || msg.to === req.agent?.id
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Not authorized to view this thread' });
        return;
      }

      res.json({ threadId, messages, count: messages.length });
    } catch (error) {
      next(error);
    }
  }

  async markDelivered(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const message = await messageService.markDelivered(id);

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      logger.info('Message marked as delivered', { messageId: id });

      res.json({ message });
    } catch (error) {
      next(error);
    }
  }

  async markAllDelivered(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const count = await messageService.markAllDeliveredForAgent(req.agent.id);

      logger.info('All messages marked as delivered', {
        agentId: req.agent.id,
        count,
      });

      res.json({ delivered: count });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const message = await messageService.markRead(id);

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      logger.info('Message marked as read', { messageId: id });

      res.json({ message });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const count = await messageService.markAllReadForAgent(req.agent.id);

      logger.info('All messages marked as read', {
        agentId: req.agent.id,
        count,
      });

      res.json({ read: count });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const count = await messageService.getUnreadCount(req.agent.id);

      res.json({ unread: count });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const deleted = await messageService.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      logger.info('Message deleted', { messageId: id });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [total, undelivered, unread] = await Promise.all([
        messageService.count(),
        MessageModel.countDocuments({ delivered: false }),
        MessageModel.countDocuments({ read: false }),
      ]);

      res.json({
        total,
        undelivered,
        delivered: total - undelivered,
        unread,
        read: total - unread,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
