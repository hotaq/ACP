import { Router } from 'express';
import { agentController } from './agent.controller.js';
import { soulAuth } from '../../middleware/soul.auth.js';

const router = Router();

// Public routes
router.post('/register', agentController.register.bind(agentController));
router.get('/', agentController.getAgents.bind(agentController));
router.get('/stats', agentController.getStats.bind(agentController));

// Protected routes (require Soul authentication)
router.get('/me', soulAuth, agentController.getMe.bind(agentController));
router.post('/heartbeat', soulAuth, agentController.heartbeat.bind(agentController));

// Friend routes (all protected)
router.post('/friends/request', soulAuth, agentController.sendFriendRequest.bind(agentController));
router.post('/friends/accept/:id', soulAuth, agentController.acceptFriendRequest.bind(agentController));
router.post('/friends/reject/:id', soulAuth, agentController.rejectFriendRequest.bind(agentController));
router.delete('/friends/:id', soulAuth, agentController.removeFriend.bind(agentController));
router.get('/friends', soulAuth, agentController.getFriends.bind(agentController));
router.get('/friends/pending', soulAuth, agentController.getPendingRequests.bind(agentController));
router.post('/friends/allow-all', soulAuth, agentController.setAllowAllMessages.bind(agentController));

// Agent-specific routes
router.get('/:id', agentController.getAgent.bind(agentController));
router.put('/:id', soulAuth, agentController.updateAgent.bind(agentController));
router.delete('/:id', soulAuth, agentController.deleteAgent.bind(agentController));

export default router;
