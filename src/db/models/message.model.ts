import mongoose, { Schema } from 'mongoose';
import type { MessageType, MessagePriority, IMessageDocument } from '../../types/index.js';

const MessageSchema = new Schema<IMessageDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    from: {
      type: String,
      required: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['request', 'response', 'notification'] as MessageType[],
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'] as MessagePriority[],
      default: 'normal',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    threadId: {
      type: String,
      index: true,
      default: null,
    },
    parentMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
MessageSchema.index({ from: 1, timestamp: -1 });
MessageSchema.index({ to: 1, timestamp: -1 });
MessageSchema.index({ delivered: 1 });
MessageSchema.index({ read: 1 });
MessageSchema.index({ threadId: 1, timestamp: 1 });

export const MessageModel = mongoose.model<IMessageDocument>('Message', MessageSchema);
