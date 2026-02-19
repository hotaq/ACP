import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDatabase } from './db/connection.js';
import agentRoutes from './modules/agent/agent.routes.js';
import messageRoutes from './modules/message/message.routes.js';
import docsRoutes from './docs/docs.routes.js';
import { queueService } from './modules/queue/queue.service.js';
import { SocketHandler } from './websocket/socket.handler.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import logger from './utils/logger.js';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.body,
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Root endpoint - redirect to docs
  app.get('/', (_req, res) => {
    res.redirect('/docs');
  });

  // Documentation Routes
  app.use('/docs', docsRoutes);

  // API Routes
  app.use('/api/agents', agentRoutes);
  app.use('/api/messages', messageRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
};

export const startServer = async () => {
  const app = createApp();
  const httpServer = createServer(app);

  // Setup Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Initialize socket handler
  const socketHandler = new SocketHandler(io);

  // Connect to MongoDB
  await connectDatabase();

  // Start queue worker
  queueService.startWorker();

  // Start server
  httpServer.listen(config.port, () => {
    logger.info(`ACP Hub started`, {
      port: config.port,
      environment: config.nodeEnv,
    });
    logger.info(`API available at http://localhost:${config.port}/api`);
    logger.info(`WebSocket available at ws://localhost:${config.port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      try {
        await queueService.close();
        const { disconnectDatabase } = await import('./db/connection.js');
        await disconnectDatabase();

        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { app, httpServer, io, socketHandler };
};
