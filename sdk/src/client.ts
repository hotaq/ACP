import { io, Socket } from 'socket.io-client';
import type {
  Agent,
  AgentConfig,
  ACPClientOptions,
  ACPClientEvents,
  Message,
  SendMessageOptions,
  RegistrationResponse,
} from './types.js';

const DEFAULT_URL = 'http://localhost:3000';
const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

export class ACPClient {
  private url: string;
  private config?: AgentConfig;
  private apiKey?: string;
  private socket: Socket | null = null;
  private agent: Agent | null = null;
  private autoReconnect: boolean;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private isIntentionalDisconnect = false;
  private eventHandlers: Partial<{ [K in keyof ACPClientEvents]: ACPClientEvents[K][] }> = {};

  constructor(options: ACPClientOptions = {}) {
    this.url = options.url || DEFAULT_URL;
    this.apiKey = options.apiKey;
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  }

  async connect(config: AgentConfig): Promise<Agent>;
  async connect(): Promise<Agent>;
  async connect(config?: AgentConfig): Promise<Agent> {
    if (config) {
      this.config = config;
    }

    if (!this.apiKey && this.config) {
      await this.register();
    }

    if (!this.apiKey) {
      throw new Error('No API key provided and no config for registration');
    }

    if (!this.agent) {
      try {
        this.agent = await this.getMe();
      } catch {
        // Will get agent info after WebSocket connects
      }
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        auth: { apiKey: this.apiKey },
        transports: ['websocket'],
        reconnection: false,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
      });

      this.socket.on('connected', async (data: { agentId: string; message: string }) => {
        if (!this.agent) {
          try {
            this.agent = await this.getMe();
          } catch {
            reject(new Error('Failed to get agent info'));
            return;
          }
        }
        this.emit('connected', this.agent);
        resolve(this.agent);
      });

      this.socket.on('message:receive', (message: Message) => {
        this.emit('message', message);
      });

      this.socket.on('agent:online', (agent: { id: string; name: string }) => {
        this.emit('agentOnline', agent);
      });

      this.socket.on('agent:offline', (agent: { id: string; name: string }) => {
        this.emit('agentOffline', agent);
      });

      this.socket.on('disconnect', () => {
        this.emit('disconnected');
        if (this.autoReconnect && !this.isIntentionalDisconnect) {
          this.attemptReconnect();
        }
      });

      this.socket.on('error', (error: Error) => {
        this.emit('error', error);
        reject(error);
      });

      this.socket.on('connect_error', (error: Error) => {
        this.emit('error', error);
        if (this.autoReconnect && !this.isIntentionalDisconnect) {
          this.attemptReconnect();
        }
        reject(error);
      });
    });
  }

  private async register(): Promise<void> {
    if (!this.config) {
      throw new Error('No agent config provided for registration');
    }

    const response = await fetch(`${this.url}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.config.name,
        type: this.config.type || 'custom',
        capabilities: this.config.capabilities || [],
        endpoint: this.config.endpoint || `sdk://${this.config.name}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json() as RegistrationResponse;
    this.apiKey = data.apiKey;
    this.agent = data.agent;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    setTimeout(() => {
      if (this.socket && !this.socket.connected && !this.isIntentionalDisconnect) {
        this.socket.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  async send(options: SendMessageOptions): Promise<{ id: string; threadId: string }> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      const payload = options.text
        ? { text: options.text }
        : options.payload || {};

      this.socket!.emit('message:send', {
        to: options.to,
        type: options.type || 'notification',
        payload,
        priority: options.priority || 'normal',
        threadId: options.threadId,
      });

      this.socket!.once('error', (error: Error) => reject(error));

      setTimeout(() => {
        resolve({ id: '', threadId: options.threadId || '' });
      }, 100);
    });
  }

  async sendREST(options: SendMessageOptions): Promise<{ ok: boolean; id: string; threadId: string }> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const body = options.text
      ? { to: options.to, text: options.text }
      : { to: options.to, type: options.type || 'notification', payload: options.payload };

    const response = await fetch(`${this.url}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json() as Promise<{ ok: boolean; id: string; threadId: string }>;
  }

  broadcast(text: string): Promise<{ id: string; threadId: string }> {
    return this.send({ to: 'broadcast', text });
  }

  async getAgents(status?: 'online' | 'offline' | 'busy'): Promise<Agent[]> {
    const url = status
      ? `${this.url}/api/agents?status=${status}`
      : `${this.url}/api/agents`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get agents');
    }

    const data = await response.json() as { agents: Agent[] };
    return data.agents;
  }

  async getMe(): Promise<Agent> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.url}/api/agents/me`, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error('Failed to get agent info');
    }

    const data = await response.json() as { agent: Agent };
    return data.agent;
  }

  async heartbeat(): Promise<{ online: boolean }> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.url}/api/agents/heartbeat`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error('Heartbeat failed');
    }

    return response.json() as Promise<{ online: boolean }>;
  }

  on<K extends keyof ACPClientEvents>(event: K, handler: ACPClientEvents[K]): this {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event]!.push(handler);
    return this;
  }

  off<K extends keyof ACPClientEvents>(event: K, handler: ACPClientEvents[K]): this {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  private emit<K extends keyof ACPClientEvents>(
    event: K,
    ...args: Parameters<ACPClientEvents[K]>
  ): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach(handler => (handler as (...args: unknown[]) => void)(...args));
    }
  }

  disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  get currentAgent(): Agent | null {
    return this.agent;
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
