import { Server, Socket } from 'socket.io';
import { isApiKey, hashApiKey } from '../utils/auth.js';
import { agentService } from '../modules/agent/agent.service.js';
import { messageService } from '../modules/message/message.service.js';
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
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.apiKey ||
                      socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error('Authentication required: provide apiKey'));
        }

        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;

        if (!isApiKey(tokenValue)) {
          return next(new Error('Invalid API key format'));
        }

        const apiKeyHash = hashApiKey(tokenValue);
        const agent = await agentService.findByApiKeyHash(apiKeyHash);

        if (!agent) {
          return next(new Error('Invalid API key'));
        }

        (socket as AuthenticatedSocket).data = {
          agentId: agent.id,
          agentName: agent.name,
          capabilities: agent.capabilities,
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

      this.agentSockets.set(agentId, socket);
      await agentService.updateStatus(agentId, 'online');
      socket.join(`agent:${agentId}`);
      socket.broadcast.emit('agent:online', { id: agentId, name: agentName });

      await this.sendUndeliveredMessages(agentId, socket);

      socket.emit('connected', {
        agentId,
        message: 'Successfully connected to ACP Hub',
      });

      socket.on('message:send', async (data: SocketMessage) => {
        await this.handleMessageSend(socket, data);
      });

      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });

      socket.on('error', (error: Error) => {
        logger.error('Socket error', { agentId, error: error.message });
      });
    });
  }

  private async handleMessageSend(socket: AuthenticatedSocket, data: SocketMessage): Promise<void> {
    try {
      const { agentId } = socket.data;

      const message = await messageService.create(agentId, {
        to: data.to,
        type: data.type,
        payload: data.payload,
        priority: data.priority || 'normal',
      });

      await this.deliverMessage(message);

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

    logger.info('Agent disconnected from WebSocket', { agentId, agentName });

    this.agentSockets.delete(agentId);
    await agentService.updateStatus(agentId, 'offline');
    socket.broadcast.emit('agent:offline', { id: agentId, name: agentName });
  }

  async deliverMessage(message: Message): Promise<boolean> {
    try {
      if (message.to === 'broadcast') {
        this.io.emit('message:receive', message);
        await messageService.markDelivered(message.id);
        return true;
      }

      const recipientSocket = this.agentSockets.get(message.to);

      if (recipientSocket) {
        recipientSocket.emit('message:receive', message);
        await messageService.markDelivered(message.id);
        logger.debug('Message delivered via WebSocket', {
          messageId: message.id,
          to: message.to,
        });
        return true;
      }

      logger.debug('Recipient not connected, message stored for later delivery', {
        messageId: message.id,
        to: message.to,
      });
      return false;
    } catch (error) {
      logger.error('Error delivering message', { messageId: message.id, error });
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
      logger.error('Error sending undelivered messages', { agentId, error });
    }
  }

  getConnectedAgents(): string[] {
    return Array.from(this.agentSockets.keys());
  }

  isAgentConnected(agentId: string): boolean {
    return this.agentSockets.has(agentId);
  }
}
