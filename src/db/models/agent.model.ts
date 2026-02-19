import mongoose, { Schema } from 'mongoose';
import type { AgentType, AgentStatus, IAgentDocument } from '../../types/index.js';

const AgentSchema = new Schema<IAgentDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['claude-code', 'opencode', 'custom'] as AgentType[],
      required: true,
    },
    capabilities: {
      type: [String],
      default: [],
    },
    endpoint: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy'] as AgentStatus[],
      default: 'offline',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    apiKeyHash: {
      type: String,
      required: true,
      unique: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    friends: {
      type: [String],
      default: [],
    },
    pendingRequests: {
      type: [String],
      default: [],
    },
    sentRequests: {
      type: [String],
      default: [],
    },
    allowAllMessages: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AgentSchema.index({ status: 1 });
AgentSchema.index({ capabilities: 1 });
AgentSchema.index({ name: 'text' });
AgentSchema.index({ friends: 1 });

// Instance method to convert to JSON
AgentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete (obj as Record<string, unknown>)._id;
  delete (obj as Record<string, unknown>).__v;
  delete (obj as Record<string, unknown>).apiKeyHash;
  return obj;
};

export const AgentModel = mongoose.model<IAgentDocument>('Agent', AgentSchema);
