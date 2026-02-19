import type { Socket } from 'socket.io';

export interface SocketData {
  agentId: string;
  agentName: string;
  capabilities: string[];
  connectedAt: Date;
}

export interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

export interface SocketMessage {
  to: string | 'broadcast';
  type: 'request' | 'response' | 'notification';
  payload: unknown;
  priority?: 'low' | 'normal' | 'high';
}

export interface IncomingEvents {
  'agent:connect': (soul: string) => void;
  'agent:disconnect': () => void;
  'message:send': (message: SocketMessage) => void;
}

export interface OutgoingEvents {
  'message:receive': (message: unknown) => void;
  'agent:online': (agent: { id: string; name: string }) => void;
  'agent:offline': (agent: { id: string; name: string }) => void;
  'error': (error: { message: string }) => void;
  'connected': (data: { agentId: string; message: string }) => void;
}
