import { Server, Socket } from 'socket.io';
import { verifySoul } from '../utils/soul.js';
import { agentService } from '../modules/agent/agent.service.js';
import { messageService } from '../modules/message/message.service.js';
import { queueService } from '../modules/queue/queue.service.js';
import logger from '../utils/logger.js';
import type { AuthenticatedSocket, SocketMessage } from './socket.types.js';
import type { Message } from '../types/index.js';

export class SocketHandler {
  private io: Server;
  private agentSockets: Map<string, Socket> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupQueueHandler();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const soul = socket.handshake.auth.soul || socket.handshake.headers.authorization;

        if (!soul) {
          return next(new Error('Authentication required'));
        }

        // Extract soul from Bearer token if needed
        const soulToken = soul.startsWith('Bearer ') ? soul.slice(7) : soul;

        const payload = verifySoul(soulToken);
        if (!payload) {
          return next(new Error('Invalid or expired soul token'));
        }

        // Verify agent exists
        const agent = await agentService.findById(payload.agentId);
        if (!agent) {
          return next(new Error('Agent not found'));
        }

        // Attach agent info to socket
        (socket as AuthenticatedSocket).data = {
          agentId: payload.agentId,
          agentName: payload.name,
          capabilities: payload.capabilities,
          connectedAt: new Date(),
        };

        next();
      } catch (error) {
        logger.error('Socket authentication error', { error });
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      const { agentId, agentName } = socket.data;

      logger.info('Agent connected via WebSocket', {
        agentId,
        agentName,
        socketId: socket.id,
      });

      // Store socket reference
      this.agentSockets.set(agentId, socket);

      // Update agent status to online
      await agentService.updateStatus(agentId, 'online');

      // Join agent's personal room
      socket.join(`agent:${agentId}`);

      // Notify others about agent coming online
      socket.broadcast.emit('agent:online', { id: agentId, name: agentName });

      // Send any undelivered messages
      await this.sendUndeliveredMessages(agentId, socket);

      // Send confirmation to agent
      socket.emit('connected', {
        agentId,
        message: 'Successfully connected to ACP Hub',
      });

      // Handle incoming messages
      socket.on('message:send', async (data: SocketMessage) => {
        await this.handleMessageSend(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error', {
          agentId,
          error: error.message,
        });
      });
    });
  }

  private setupQueueHandler(): void {
    // Set up message handler for queue processing
    queueService.setMessageHandler(async (message: Message) => {
      await this.deliverMessage(message);
    });
  }

  private async handleMessageSend(socket: AuthenticatedSocket, data: SocketMessage): Promise<void> {
    try {
      const { agentId } = socket.data;

      // Create message
      const message = await messageService.create(agentId, {
        to: data.to,
        type: data.type,
        payload: data.payload,
        priority: data.priority || 'normal',
      });

      // Add to queue for delivery
      await queueService.addMessageJob(message);

      logger.debug('Message sent via WebSocket', {
        messageId: message.id,
        from: agentId,
        to: message.to,
      });
    } catch (error) {
      logger.error('Error sending message via WebSocket', {
        agentId: socket.data.agentId,
        error,
      });

      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
    const { agentId, agentName } = socket.data;

    logger.info('Agent disconnected from WebSocket', {
      agentId,
      agentName,
    });

    // Remove socket reference
    this.agentSockets.delete(agentId);

    // Update agent status to offline
    await agentService.updateStatus(agentId, 'offline');

    // Notify others about agent going offline
    socket.broadcast.emit('agent:offline', { id: agentId, name: agentName });
  }

  async deliverMessage(message: Message): Promise<boolean> {
    try {
      if (message.to === 'broadcast') {
        // Broadcast to all connected agents except sender
        this.io.emit('message:receive', message);
        await messageService.markDelivered(message.id);
        return true;
      }

      // Send to specific agent
      const recipientSocket = this.agentSockets.get(message.to);

      if (recipientSocket) {
        // Agent is connected, deliver immediately
        recipientSocket.emit('message:receive', message);
        await messageService.markDelivered(message.id);

        logger.debug('Message delivered via WebSocket', {
          messageId: message.id,
          to: message.to,
        });

        return true;
      }

      // Agent not connected, message will remain undelivered
      // It will be sent when agent reconnects
      logger.debug('Recipient not connected, message queued', {
        messageId: message.id,
        to: message.to,
      });

      return false;
    } catch (error) {
      logger.error('Error delivering message', {
        messageId: message.id,
        error,
      });

      return false;
    }
  }

  private async sendUndeliveredMessages(agentId: string, socket: Socket): Promise<void> {
    try {
      const messages = await messageService.findMessagesForAgent(agentId, {
        undeliveredOnly: true,
        limit: 100,
      });

      for (const message of messages) {
        socket.emit('message:receive', message);
        await messageService.markDelivered(message.id);
      }

      if (messages.length > 0) {
        logger.info('Sent undelivered messages to agent', {
          agentId,
          count: messages.length,
        });
      }
    } catch (error) {
      logger.error('Error sending undelivered messages', {
        agentId,
        error,
      });
    }
  }

  getConnectedAgents(): string[] {
    return Array.from(this.agentSockets.keys());
  }

  isAgentConnected(agentId: string): boolean {
    return this.agentSockets.has(agentId);
  }
}
