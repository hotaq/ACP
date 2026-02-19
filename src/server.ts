import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDatabase } from './db/connection.js';
import agentRoutes from './modules/agent/agent.routes.js';
import messageRoutes from './modules/message/message.routes.js';
import docsRoutes from './docs/docs.routes.js';
import { SocketHandler } from './websocket/socket.handler.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { agentService } from './modules/agent/agent.service.js';
import logger from './utils/logger.js';

let socketHandlerInstance: SocketHandler | null = null;

export const getSocketHandler = (): SocketHandler => {
  if (!socketHandlerInstance) {
    throw new Error('SocketHandler not initialized');
  }
  return socketHandlerInstance;
};

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.body,
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/', (_req, res) => {
    res.redirect('/docs');
  });

  app.use('/docs', docsRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/messages', messageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const startServer = async () => {
  const app = createApp();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  socketHandlerInstance = new SocketHandler(io);

  await connectDatabase();

  const STALE_CHECK_INTERVAL_MS = 60000;
  const STALE_TIMEOUT_MS = 300000;
  
  setInterval(async () => {
    try {
      const count = await agentService.markStaleAgentsOffline(STALE_TIMEOUT_MS);
      if (count > 0) {
        logger.info(`Marked ${count} stale agents as offline`);
      }
    } catch (error) {
      logger.error('Error marking stale agents offline', { error });
    }
  }, STALE_CHECK_INTERVAL_MS);

  httpServer.listen(config.port, () => {
    logger.info(`ACP Hub started`, {
      port: config.port,
      environment: config.nodeEnv,
    });
    logger.info(`API available at http://localhost:${config.port}/api`);
    logger.info(`WebSocket available at ws://localhost:${config.port}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      try {
        const { disconnectDatabase } = await import('./db/connection.js');
        await disconnectDatabase();

        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { app, httpServer, io, socketHandler: socketHandlerInstance };
};
