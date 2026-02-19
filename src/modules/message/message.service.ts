import { v4 as uuidv4 } from 'uuid';
import { MessageModel } from '../../db/models/message.model.js';
import type { Message, IMessageDocument } from '../../types/index.js';
import type { SendMessageInput, GetMessagesQuery } from './message.types.js';

export class MessageService {
  async create(
    from: string,
    input: SendMessageInput
  ): Promise<Message> {
    const messageId = uuidv4();

    const messageDoc = await MessageModel.create({
      id: messageId,
      from,
      to: input.to,
      type: input.type,
      payload: input.payload,
      priority: input.priority,
      timestamp: new Date(),
      delivered: false,
      read: false,
      readAt: null,
      threadId: input.threadId || null,
      parentMessageId: input.parentMessageId || null,
    });

    return this.documentToMessage(messageDoc);
  }

  async findById(id: string): Promise<Message | null> {
    const messageDoc = await MessageModel.findOne({ id });
    return messageDoc ? this.documentToMessage(messageDoc) : null;
  }

  async findMessages(query: GetMessagesQuery): Promise<Message[]> {
    const filter: Record<string, unknown> = {};

    if (query.from) filter.from = query.from;
    if (query.to) filter.to = query.to;
    if (query.type) filter.type = query.type;
    if (query.delivered !== undefined) {
      filter.delivered = query.delivered === 'true';
    }
    if (query.read !== undefined) {
      filter.read = query.read === 'true';
    }
    if (query.threadId) filter.threadId = query.threadId;

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const messageDocs = await MessageModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(Math.min(limit, 100));

    return messageDocs.map((doc) => this.documentToMessage(doc));
  }

  async findMessagesForAgent(agentId: string, options?: { limit?: number; offset?: number; undeliveredOnly?: boolean; unreadOnly?: boolean }): Promise<Message[]> {
    const filter: Record<string, unknown> = {
      $or: [{ to: agentId }, { to: 'broadcast' }],
    };

    if (options?.undeliveredOnly) {
      filter.delivered = false;
    }

    if (options?.unreadOnly) {
      filter.read = false;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const messageDocs = await MessageModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(Math.min(limit, 100));

    return messageDocs.map((doc) => this.documentToMessage(doc));
  }

  async findThread(threadId: string): Promise<Message[]> {
    const messageDocs = await MessageModel.find({ threadId })
      .sort({ timestamp: 1 });
    return messageDocs.map((doc) => this.documentToMessage(doc));
  }

  async markDelivered(id: string): Promise<Message | null> {
    const messageDoc = await MessageModel.findOneAndUpdate(
      { id },
      { $set: { delivered: true } },
      { new: true }
    );
    return messageDoc ? this.documentToMessage(messageDoc) : null;
  }

  async markRead(id: string): Promise<Message | null> {
    const messageDoc = await MessageModel.findOneAndUpdate(
      { id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    return messageDoc ? this.documentToMessage(messageDoc) : null;
  }

  async markAllReadForAgent(agentId: string): Promise<number> {
    const result = await MessageModel.updateMany(
      { to: agentId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return result.modifiedCount;
  }

  async markAllDeliveredForAgent(agentId: string): Promise<number> {
    const result = await MessageModel.updateMany(
      { to: agentId, delivered: false },
      { $set: { delivered: true } }
    );
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await MessageModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async deleteOldMessages(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await MessageModel.deleteMany({
      timestamp: { $lt: cutoffDate },
      delivered: true,
    });

    return result.deletedCount;
  }

  async count(query?: { from?: string; to?: string; threadId?: string }): Promise<number> {
    const filter: Record<string, unknown> = {};
    if (query?.from) filter.from = query.from;
    if (query?.to) filter.to = query.to;
    if (query?.threadId) filter.threadId = query.threadId;
    return MessageModel.countDocuments(filter);
  }

  async getUnreadCount(agentId: string): Promise<number> {
    return MessageModel.countDocuments({
      to: agentId,
      read: false,
    });
  }

  private documentToMessage(doc: IMessageDocument): Message {
    return {
      id: doc.id,
      from: doc.from,
      to: doc.to,
      type: doc.type,
      payload: doc.payload,
      priority: doc.priority,
      timestamp: doc.timestamp,
      delivered: doc.delivered,
      read: doc.read,
      readAt: doc.readAt,
      threadId: doc.threadId,
      parentMessageId: doc.parentMessageId,
    };
  }
}

export const messageService = new MessageService();
