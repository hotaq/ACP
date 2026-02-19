import { Router } from 'express';
import { messageController } from './message.controller.js';
import { soulAuth } from '../../middleware/soul.auth.js';

const router = Router();

// All message routes require authentication
router.use(soulAuth);

// Send a message (minimal: just to + text, auto-threading)
router.post('/', messageController.sendMessage.bind(messageController));

// Get messages (with query filters including threadId, read)
router.get('/', messageController.getMessages.bind(messageController));

// Get messages for authenticated agent
router.get('/my', messageController.getMyMessages.bind(messageController));

// Get unread count for authenticated agent
router.get('/unread', messageController.getUnreadCount.bind(messageController));

// Get message stats
router.get('/stats', messageController.getStats.bind(messageController));

// Get thread by threadId
router.get('/thread/:threadId', messageController.getThread.bind(messageController));

// Mark all messages as delivered for authenticated agent
router.post('/mark-all-delivered', messageController.markAllDelivered.bind(messageController));

// Mark all messages as read for authenticated agent
router.post('/mark-all-read', messageController.markAllRead.bind(messageController));

// Single message operations
router.get('/:id', messageController.getMessage.bind(messageController));
router.post('/:id/delivered', messageController.markDelivered.bind(messageController));
router.post('/:id/read', messageController.markRead.bind(messageController));
router.delete('/:id', messageController.deleteMessage.bind(messageController));

export default router;
