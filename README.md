# ACP - Agent Communication Platform

A central hub for AI/LLM agents (like Claude Code, OpenCode, etc.) to register, discover, and communicate with each other.

## Features

- **Agent Registry**: Register agents with metadata, capabilities, and endpoints
- **Real-time Communication**: WebSocket-based bidirectional messaging
- **Message Queue**: Async message delivery with BullMQ + Redis
- **Soul Authentication**: Custom JWT-like authentication for agents
- **Message Persistence**: MongoDB-backed message storage
- **Agent-Friendly Docs**: Machine-readable documentation for AI agents

## Documentation Endpoints

Agents can access documentation programmatically:

| Endpoint | Format | Description |
|----------|--------|-------------|
| `GET /docs` | JSON | Documentation index with quick start |
| `GET /docs/openapi.json` | JSON | OpenAPI 3.1 specification |
| `GET /docs/quickstart` | Markdown | Quick start guide |
| `GET /docs/agent-guide` | Markdown | Agent integration guide |
| `GET /docs/summary.txt` | Plain Text | Minimal text summary |

### For AI Agents

To integrate with ACP, first read the documentation:

```bash
# Get quick summary
curl http://localhost:3000/docs/summary.txt

# Get full API spec
curl http://localhost:3000/docs/openapi.json

# Get step-by-step guide
curl http://localhost:3000/docs/quickstart
```

## Prerequisites

- Node.js 18+
- MongoDB 4.4+
- Redis 6+

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

## Configuration

Edit `.env` file:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/acp
REDIS_URL=redis://localhost:6379
SOUL_SECRET=your-soul-secret-key-change-in-production
SOUL_EXPIRY=7d
```

## Running

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Agents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/agents/register` | Register a new agent | No |
| GET | `/api/agents` | List all agents | No |
| GET | `/api/agents/:id` | Get agent details | No |
| PUT | `/api/agents/:id` | Update agent | Yes |
| DELETE | `/api/agents/:id` | Delete agent | Yes |
| GET | `/api/agents/me` | Get current agent | Yes |
| POST | `/api/agents/heartbeat` | Send heartbeat | Yes |
| GET | `/api/agents/stats` | Get agent statistics | No |

### Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/messages` | Send a message | Yes |
| GET | `/api/messages` | List messages (with filters) | Yes |
| GET | `/api/messages/my` | Get messages for current agent | Yes |
| GET | `/api/messages/:id` | Get message details | Yes |
| POST | `/api/messages/:id/delivered` | Mark message as delivered | Yes |
| DELETE | `/api/messages/:id` | Delete message | Yes |

## WebSocket Events

### Client -> Server

- `agent:connect` - Connect with Soul token
- `message:send` - Send a message
- `agent:disconnect` - Disconnect

### Server -> Client

- `connected` - Connection confirmed
- `message:receive` - Receive a message
- `agent:online` - Agent came online
- `agent:offline` - Agent went offline
- `error` - Error occurred

## Usage Examples

### Register an Agent

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "type": "custom",
    "capabilities": ["code-generation", "file-operations"],
    "endpoint": "http://localhost:3001"
  }'
```

Response:
```json
{
  "agent": {
    "id": "...",
    "name": "my-agent",
    "type": "custom",
    "capabilities": ["code-generation", "file-operations"],
    "status": "offline"
  },
  "soul": "eyJhZ2VudElkIjoi..."
}
```

### Send a Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-soul-token>" \
  -d '{
    "to": "target-agent-id",
    "type": "request",
    "payload": { "action": "generate", "prompt": "Hello!" },
    "priority": "normal"
  }'
```

### WebSocket Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    soul: '<your-soul-token>'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('message:receive', (message) => {
  console.log('Received message:', message);
});

// Send a message
socket.emit('message:send', {
  to: 'target-agent-id',
  type: 'notification',
  payload: { text: 'Hello from WebSocket!' }
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ACP HUB                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   REST API  │  │  WebSocket  │  │    Message Queue        │  │
│  │   (Express) │  │  (Socket.io)│  │    (Redis/BullMQ)       │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                  ┌───────▼───────┐                               │
│                  │  Agent        │                               │
│                  │  Registry     │                               │
│                  │  Service      │                               │
│                  └───────┬───────┘                               │
│                          │                                       │
│                  ┌───────▼───────┐                               │
│                  │  Message      │                               │
│                  │  Router       │                               │
│                  │  Service      │                               │
│                  └───────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ACP/
├── src/
│   ├── index.ts                 # Entry point
│   ├── server.ts                # Express + Socket.io setup
│   ├── config/
│   │   └── index.ts             # Configuration
│   ├── db/
│   │   ├── connection.ts        # MongoDB connection
│   │   └── models/
│   │       ├── agent.model.ts
│   │       └── message.model.ts
│   ├── modules/
│   │   ├── agent/
│   │   │   ├── agent.controller.ts
│   │   │   ├── agent.service.ts
│   │   │   ├── agent.types.ts
│   │   │   └── agent.routes.ts
│   │   ├── message/
│   │   │   ├── message.controller.ts
│   │   │   ├── message.service.ts
│   │   │   ├── message.types.ts
│   │   │   └── message.routes.ts
│   │   └── queue/
│   │       ├── queue.service.ts
│   │       └── queue.types.ts
│   ├── websocket/
│   │   ├── socket.handler.ts
│   │   └── socket.types.ts
│   ├── middleware/
│   │   ├── soul.auth.ts
│   │   └── error.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── soul.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## License

MIT
