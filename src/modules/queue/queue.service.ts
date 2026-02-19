import { Queue, Worker, Job } from 'bullmq';
import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';
import type { Message } from '../../types/index.js';
import type { QueueMessage } from './queue.types.js';

export class QueueService {
  private messageQueue: Queue;
  private worker: Worker | null = null;
  private messageHandler: ((message: Message) => Promise<void>) | null = null;

  constructor() {
    // Use connection options instead of Redis instance
    const connectionOptions = {
      host: config.redisUrl.includes('://')
        ? new URL(config.redisUrl).hostname
        : 'localhost',
      port: config.redisUrl.includes('://')
        ? parseInt(new URL(config.redisUrl).port) || 6379
        : 6379,
      maxRetriesPerRequest: null,
    };

    this.messageQueue = new Queue<QueueMessage>('messages', {
      connection: connectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep up to 1000 completed jobs
        },
        removeOnFail: {
          age: 24 * 3600, // Keep failed jobs for 24 hours
        },
      },
    });
  }

  async addMessageJob(message: Message): Promise<void> {
    const priority = this.getPriority(message.priority);

    await this.messageQueue.add('deliver', message as QueueMessage, {
      priority,
      jobId: message.id,
    });

    logger.debug('Message added to queue', {
      messageId: message.id,
      priority,
    });
  }

  setMessageHandler(handler: (message: Message) => Promise<void>): void {
    this.messageHandler = handler;
  }

  startWorker(): void {
    if (this.worker) {
      logger.warn('Worker already started');
      return;
    }

    const connectionOptions = {
      host: config.redisUrl.includes('://')
        ? new URL(config.redisUrl).hostname
        : 'localhost',
      port: config.redisUrl.includes('://')
        ? parseInt(new URL(config.redisUrl).port) || 6379
        : 6379,
      maxRetriesPerRequest: null,
    };

    this.worker = new Worker<QueueMessage>(
      'messages',
      async (job: Job<QueueMessage>) => {
        return this.processJob(job);
      },
      {
        connection: connectionOptions,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job: Job) => {
      logger.debug('Job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      logger.error('Job failed', {
        jobId: job?.id,
        error: error.message,
      });
    });

    this.worker.on('error', (error: Error) => {
      logger.error('Worker error', { error: error.message });
    });

    logger.info('Message queue worker started');
  }

  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('Message queue worker stopped');
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount(),
      this.messageQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async pauseQueue(): Promise<void> {
    await this.messageQueue.pause();
    logger.info('Message queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.messageQueue.resume();
    logger.info('Message queue resumed');
  }

  async close(): Promise<void> {
    await this.stopWorker();
    await this.messageQueue.close();
    logger.info('Queue service closed');
  }

  private async processJob(job: Job<QueueMessage>): Promise<void> {
    const message = job.data;

    logger.debug('Processing message job', {
      jobId: job.id,
      messageId: message.id,
      to: message.to,
    });

    if (this.messageHandler) {
      await this.messageHandler(message as Message);
    } else {
      logger.warn('No message handler set, message will not be delivered', {
        messageId: message.id,
      });
    }
  }

  private getPriority(priority: Message['priority']): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'normal':
        return 5;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }
}

export const queueService = new QueueService();
