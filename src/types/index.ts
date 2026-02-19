import mongoose from 'mongoose';

// Agent Types
export type AgentType = 'claude-code' | 'opencode' | 'custom';
export type AgentStatus = 'online' | 'offline' | 'busy';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  endpoint: string;
  status: AgentStatus;
  metadata: Record<string, unknown>;
  apiKeyHash?: string;
  createdAt: Date;
  lastSeen: Date;
  friends?: string[];
  pendingRequests?: string[];
  sentRequests?: string[];
  allowAllMessages?: boolean;
}

export interface IAgentDocument extends mongoose.Document {
  name: string;
  type: AgentType;
  capabilities: string[];
  endpoint: string;
  status: AgentStatus;
  metadata: Record<string, unknown>;
  apiKeyHash: string;
  createdAt: Date;
  lastSeen: Date;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
  allowAllMessages: boolean;
}

// Message Types
export type MessageType = 'request' | 'response' | 'notification';
export type MessagePriority = 'low' | 'normal' | 'high';

export interface Message {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  payload: unknown;
  timestamp: Date;
  priority: MessagePriority;
  delivered?: boolean;
  read?: boolean;
  readAt?: Date | null;
  threadId?: string | null;
  parentMessageId?: string | null;
}

export interface IMessageDocument extends mongoose.Document {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: unknown;
  priority: MessagePriority;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
  readAt: Date | null;
  threadId: string | null;
  parentMessageId: string | null;
}

export interface RegisterAgentRequest {
  name: string;
  type: AgentType;
  capabilities: string[];
  endpoint: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageRequest {
  to: string | 'broadcast';
  type: MessageType;
  payload: unknown;
  priority?: MessagePriority;
  threadId?: string;
  parentMessageId?: string;
}

// Socket Event Types
export interface SocketEvents {
  'agent:connect': (apiKey: string) => void;
  'agent:disconnect': () => void;
  'message:send': (message: SendMessageRequest) => void;
  'message:receive': (message: Message) => void;
}
