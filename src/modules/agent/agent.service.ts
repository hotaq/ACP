import { AgentModel } from '../../db/models/agent.model.js';
import type { Agent, IAgentDocument } from '../../types/index.js';
import type { RegisterAgentInput, UpdateAgentInput } from './agent.types.js';

export class AgentService {
  async register(input: RegisterAgentInput, apiKeyHash: string): Promise<{ agent: Agent }> {
    const agentDoc = await AgentModel.create({
      name: input.name,
      type: input.type,
      capabilities: input.capabilities,
      endpoint: input.endpoint,
      status: 'offline',
      metadata: input.metadata || {},
      apiKeyHash,
      lastSeen: new Date(),
    });

    const agent = this.documentToAgent(agentDoc);

    return { agent };
  }

  async findById(id: string): Promise<Agent | null> {
    const agentDoc = await AgentModel.findById(id);
    return agentDoc ? this.documentToAgent(agentDoc) : null;
  }

  async findByName(name: string): Promise<Agent | null> {
    const agentDoc = await AgentModel.findOne({ name });
    return agentDoc ? this.documentToAgent(agentDoc) : null;
  }

  async findAll(): Promise<Agent[]> {
    const agentDocs = await AgentModel.find({}).sort({ createdAt: -1 });
    return agentDocs.map((doc) => this.documentToAgent(doc));
  }

  async findByCapability(capability: string): Promise<Agent[]> {
    const agentDocs = await AgentModel.find({
      capabilities: capability,
    }).sort({ createdAt: -1 });
    return agentDocs.map((doc) => this.documentToAgent(doc));
  }

  async findByStatus(status: string): Promise<Agent[]> {
    const agentDocs = await AgentModel.find({ status }).sort({ createdAt: -1 });
    return agentDocs.map((doc) => this.documentToAgent(doc));
  }

  async findByApiKeyHash(apiKeyHash: string): Promise<Agent | null> {
    const agentDoc = await AgentModel.findOne({ apiKeyHash });
    return agentDoc ? this.documentToAgent(agentDoc) : null;
  }

  async update(id: string, input: Partial<UpdateAgentInput & { apiKeyHash: string }>): Promise<Agent | null> {
    const agentDoc = await AgentModel.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true }
    );
    return agentDoc ? this.documentToAgent(agentDoc) : null;
  }

  async updateStatus(id: string, status: Agent['status']): Promise<Agent | null> {
    const agentDoc = await AgentModel.findByIdAndUpdate(
      id,
      { $set: { status, lastSeen: new Date() } },
      { new: true }
    );
    return agentDoc ? this.documentToAgent(agentDoc) : null;
  }

  async updateLastSeen(id: string): Promise<void> {
    await AgentModel.findByIdAndUpdate(id, { $set: { lastSeen: new Date() } });
  }

  async delete(id: string): Promise<boolean> {
    const result = await AgentModel.findByIdAndDelete(id);
    return result !== null;
  }

  async count(): Promise<number> {
    return AgentModel.countDocuments();
  }

  async countByStatus(status: string): Promise<number> {
    return AgentModel.countDocuments({ status });
  }

  // Friend methods
  async sendFriendRequest(fromId: string, toId: string): Promise<{ success: boolean; message: string }> {
    if (fromId === toId) {
      return { success: false, message: 'Cannot add yourself as friend' };
    }

    const [from, to] = await Promise.all([
      AgentModel.findById(fromId),
      AgentModel.findById(toId),
    ]);

    if (!from || !to) {
      return { success: false, message: 'Agent not found' };
    }

    // Check if already friends
    if (from.friends.includes(toId)) {
      return { success: false, message: 'Already friends' };
    }

    // Check if request already sent
    if (from.sentRequests.includes(toId)) {
      return { success: false, message: 'Friend request already sent' };
    }

    // Check if already has pending request from target
    if (from.pendingRequests.includes(toId)) {
      return { success: false, message: 'You have a pending request from this agent' };
    }

    // Add to sent requests of sender
    await AgentModel.findByIdAndUpdate(fromId, {
      $addToSet: { sentRequests: toId }
    });

    // Add to pending requests of receiver
    await AgentModel.findByIdAndUpdate(toId, {
      $addToSet: { pendingRequests: fromId }
    });

    return { success: true, message: 'Friend request sent' };
  }

  async acceptFriendRequest(myId: string, fromId: string): Promise<{ success: boolean; message: string }> {
    const me = await AgentModel.findById(myId);
    if (!me) {
      return { success: false, message: 'Agent not found' };
    }

    if (!me.pendingRequests.includes(fromId)) {
      return { success: false, message: 'No pending request from this agent' };
    }

    // Add each other as friends
    await AgentModel.findByIdAndUpdate(myId, {
      $pull: { pendingRequests: fromId },
      $addToSet: { friends: fromId }
    });

    await AgentModel.findByIdAndUpdate(fromId, {
      $pull: { sentRequests: myId },
      $addToSet: { friends: myId }
    });

    return { success: true, message: 'Friend request accepted' };
  }

  async rejectFriendRequest(myId: string, fromId: string): Promise<{ success: boolean; message: string }> {
    const me = await AgentModel.findById(myId);
    if (!me) {
      return { success: false, message: 'Agent not found' };
    }

    if (!me.pendingRequests.includes(fromId)) {
      return { success: false, message: 'No pending request from this agent' };
    }

    // Remove request
    await AgentModel.findByIdAndUpdate(myId, {
      $pull: { pendingRequests: fromId }
    });

    await AgentModel.findByIdAndUpdate(fromId, {
      $pull: { sentRequests: myId }
    });

    return { success: true, message: 'Friend request rejected' };
  }

  async removeFriend(myId: string, friendId: string): Promise<{ success: boolean; message: string }> {
    const me = await AgentModel.findById(myId);
    if (!me) {
      return { success: false, message: 'Agent not found' };
    }

    if (!me.friends.includes(friendId)) {
      return { success: false, message: 'Not friends' };
    }

    // Remove from both
    await AgentModel.findByIdAndUpdate(myId, {
      $pull: { friends: friendId }
    });

    await AgentModel.findByIdAndUpdate(friendId, {
      $pull: { friends: myId }
    });

    return { success: true, message: 'Friend removed' };
  }

  async getFriends(agentId: string): Promise<Agent[]> {
    const agent = await AgentModel.findById(agentId).populate('friends');
    if (!agent) return [];

    const friendDocs = await AgentModel.find({ _id: { $in: agent.friends } });
    return friendDocs.map(doc => this.documentToAgent(doc));
  }

  async getPendingRequests(agentId: string): Promise<Agent[]> {
    const agent = await AgentModel.findById(agentId);
    if (!agent) return [];

    const requestDocs = await AgentModel.find({ _id: { $in: agent.pendingRequests } });
    return requestDocs.map(doc => this.documentToAgent(doc));
  }

  async areFriends(agentId1: string, agentId2: string): Promise<boolean> {
    const agent = await AgentModel.findById(agentId1);
    if (!agent) return false;

    // Check if allowAllMessages is enabled
    if (agent.allowAllMessages) return true;

    return agent.friends.includes(agentId2);
  }

  async setAllowAllMessages(agentId: string, allow: boolean): Promise<void> {
    await AgentModel.findByIdAndUpdate(agentId, {
      $set: { allowAllMessages: allow }
    });
  }

  async regenerateApiKey(agentId: string, newApiKeyHash: string): Promise<void> {
    await AgentModel.findByIdAndUpdate(agentId, {
      $set: { apiKeyHash: newApiKeyHash }
    });
  }

  async markStaleAgentsOffline(timeoutMs: number = 60000): Promise<number> {
    const cutoffTime = new Date(Date.now() - timeoutMs);
    
    const result = await AgentModel.updateMany(
      { 
        status: 'online',
        lastSeen: { $lt: cutoffTime }
      },
      { $set: { status: 'offline' } }
    );
    
    return result.modifiedCount;
  }

  private documentToAgent(doc: IAgentDocument): Agent {
    return {
      id: doc._id.toString(),
      name: doc.name,
      type: doc.type,
      capabilities: doc.capabilities,
      endpoint: doc.endpoint,
      status: doc.status,
      metadata: doc.metadata,
      apiKeyHash: doc.apiKeyHash,
      createdAt: doc.createdAt,
      lastSeen: doc.lastSeen,
      friends: doc.friends,
      pendingRequests: doc.pendingRequests,
      sentRequests: doc.sentRequests,
      allowAllMessages: doc.allowAllMessages,
    };
  }
}

export const agentService = new AgentService();
