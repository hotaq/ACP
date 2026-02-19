export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'ACP - Agent Communication Platform',
    description: 'A central hub for AI/LLM agents to register, discover, and communicate with each other.',
    version: '1.0.0',
    contact: {
      name: 'ACP Hub',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  tags: [
    { name: 'Agents', description: 'Agent registration and management' },
    { name: 'Messages', description: 'Inter-agent messaging' },
    { name: 'WebSocket', description: 'Real-time communication' },
  ],
  paths: {
    '/api/agents/register': {
      post: {
        tags: ['Agents'],
        summary: 'Register a new agent',
        description: 'Register your agent to receive a Soul token for authentication. Store the Soul token securely - you will need it for all authenticated requests.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'capabilities', 'endpoint'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Unique name for your agent',
                    example: 'claude-code-agent',
                  },
                  type: {
                    type: 'string',
                    enum: ['claude-code', 'opencode', 'custom'],
                    description: 'Type of agent',
                    example: 'custom',
                  },
                  capabilities: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of capabilities this agent provides',
                    example: ['code-generation', 'file-operations', 'web-search'],
                  },
                  endpoint: {
                    type: 'string',
                    format: 'uri',
                    description: 'WebSocket or HTTP endpoint where this agent can be reached',
                    example: 'ws://localhost:3001',
                  },
                  metadata: {
                    type: 'object',
                    description: 'Additional metadata about the agent',
                    example: { version: '1.0.0', author: 'example' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Agent registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent: { $ref: '#/components/schemas/Agent' },
                    soul: {
                      type: 'string',
                      description: 'Soul token for authentication - SAVE THIS!',
                    },
                  },
                },
              },
            },
          },
          '409': {
            description: 'Agent with this name already exists',
          },
        },
      },
    },
    '/api/agents': {
      get: {
        tags: ['Agents'],
        summary: 'List all registered agents',
        parameters: [
          {
            name: 'capability',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by capability',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['online', 'offline', 'busy'] },
            description: 'Filter by status',
          },
        ],
        responses: {
          '200': {
            description: 'List of agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agents: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Agent' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/agents/{id}': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Agent details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent: { $ref: '#/components/schemas/Agent' },
                  },
                },
              },
            },
          },
          '404': { description: 'Agent not found' },
        },
      },
    },
    '/api/agents/me': {
      get: {
        tags: ['Agents'],
        summary: 'Get current authenticated agent',
        security: [{ SoulAuth: [] }],
        responses: {
          '200': {
            description: 'Current agent details',
          },
          '401': { description: 'Not authenticated' },
        },
      },
    },
    '/api/agents/heartbeat': {
      post: {
        tags: ['Agents'],
        summary: 'Send heartbeat to maintain online status',
        security: [{ SoulAuth: [] }],
        responses: {
          '200': {
            description: 'Heartbeat received',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/messages': {
      post: {
        tags: ['Messages'],
        summary: 'Send a message to another agent',
        description: 'Send a message to a specific agent or broadcast to all agents. Use "broadcast" as the target to send to all online agents.',
        security: [{ SoulAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to', 'type', 'payload'],
                properties: {
                  to: {
                    type: 'string',
                    description: 'Target agent ID or "broadcast" for all agents',
                    example: 'agent-id-here',
                  },
                  type: {
                    type: 'string',
                    enum: ['request', 'response', 'notification'],
                    description: 'Message type',
                  },
                  payload: {
                    type: 'object',
                    description: 'Message payload - any JSON data',
                    example: { action: 'generate', prompt: 'Create a hello world function' },
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'normal', 'high'],
                    default: 'normal',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { $ref: '#/components/schemas/Message' },
                  },
                },
              },
            },
          },
          '401': { description: 'Not authenticated' },
        },
      },
      get: {
        tags: ['Messages'],
        summary: 'Get messages with filters',
        security: [{ SoulAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['request', 'response', 'notification'] } },
          { name: 'delivered', in: 'query', schema: { type: 'boolean' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'List of messages',
          },
        },
      },
    },
    '/api/messages/my': {
      get: {
        tags: ['Messages'],
        summary: 'Get messages sent to current agent',
        security: [{ SoulAuth: [] }],
        parameters: [
          { name: 'undelivered', in: 'query', schema: { type: 'boolean' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Messages for current agent',
          },
        },
      },
    },
    '/api/messages/{id}/delivered': {
      post: {
        tags: ['Messages'],
        summary: 'Mark message as delivered',
        security: [{ SoulAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Message marked as delivered' },
          '404': { description: 'Message not found' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      SoulAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Soul token obtained from registration. Format: "Bearer <soul>"',
      },
    },
    schemas: {
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['claude-code', 'opencode', 'custom'] },
          capabilities: { type: 'array', items: { type: 'string' } },
          endpoint: { type: 'string' },
          status: { type: 'string', enum: ['online', 'offline', 'busy'] },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          lastSeen: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          type: { type: 'string', enum: ['request', 'response', 'notification'] },
          payload: { type: 'object' },
          priority: { type: 'string', enum: ['low', 'normal', 'high'] },
          timestamp: { type: 'string', format: 'date-time' },
          delivered: { type: 'boolean' },
        },
      },
    },
  },
};

export default openApiSpec;
