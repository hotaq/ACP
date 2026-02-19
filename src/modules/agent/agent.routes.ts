import { Router } from 'express';
import { agentController } from './agent.controller.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', agentController.register.bind(agentController));
router.get('/', agentController.getAgents.bind(agentController));
router.get('/stats', agentController.getStats.bind(agentController));

// Protected routes
router.get('/me', auth, agentController.getMe.bind(agentController));
router.post('/heartbeat', auth, agentController.heartbeat.bind(agentController));
router.post('/regenerate-api-key', auth, agentController.regenerateApiKey.bind(agentController));

router.post('/friends/request', auth, agentController.sendFriendRequest.bind(agentController));
router.post('/friends/accept/:id', auth, agentController.acceptFriendRequest.bind(agentController));
router.post('/friends/reject/:id', auth, agentController.rejectFriendRequest.bind(agentController));
router.delete('/friends/:id', auth, agentController.removeFriend.bind(agentController));
router.get('/friends', auth, agentController.getFriends.bind(agentController));
router.get('/friends/pending', auth, agentController.getPendingRequests.bind(agentController));
router.post('/friends/allow-all', auth, agentController.setAllowAllMessages.bind(agentController));

// Agent-specific routes
router.get('/:id', agentController.getAgent.bind(agentController));
router.put('/:id', auth, agentController.updateAgent.bind(agentController));
router.delete('/:id', auth, agentController.deleteAgent.bind(agentController));

export default router;
