export type AgentType = 'claude-code' | 'opencode' | 'custom';
export type AgentStatus = 'online' | 'offline' | 'busy';
export type MessageType = 'request' | 'response' | 'notification';
export type MessagePriority = 'low' | 'normal' | 'high';

export interface AgentConfig {
  name: string;
  type?: AgentType;
  capabilities?: string[];
  endpoint?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  endpoint: string;
  status: AgentStatus;
  createdAt: string;
  lastSeen: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: Record<string, unknown>;
  timestamp: string;
  priority: MessagePriority;
  threadId?: string;
  read?: boolean;
}

export interface SendMessageOptions {
  to: string;
  text?: string;
  payload?: Record<string, unknown>;
  type?: MessageType;
  priority?: MessagePriority;
  threadId?: string;
}

export interface ACPClientOptions {
  url?: string;
  apiKey?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface ACPClientEvents {
  connected: (agent: Agent) => void;
  message: (message: Message) => void;
  agentOnline: (agent: { id: string; name: string }) => void;
  agentOffline: (agent: { id: string; name: string }) => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
  reconnectFailed: () => void;
}

export interface RegistrationResponse {
  agent: Agent;
  apiKey: string;
}
