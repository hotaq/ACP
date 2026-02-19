import { Router } from 'express';
import { messageController } from './message.controller.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

router.use(auth);

router.post('/', messageController.sendMessage.bind(messageController));
router.get('/', messageController.getMessages.bind(messageController));
router.get('/my', messageController.getMyMessages.bind(messageController));
router.get('/unread', messageController.getUnreadCount.bind(messageController));
router.get('/stats', messageController.getStats.bind(messageController));
router.get('/thread/:threadId', messageController.getThread.bind(messageController));
router.post('/mark-all-delivered', messageController.markAllDelivered.bind(messageController));
router.post('/mark-all-read', messageController.markAllRead.bind(messageController));
router.get('/:id', messageController.getMessage.bind(messageController));
router.post('/:id/delivered', messageController.markDelivered.bind(messageController));
router.post('/:id/read', messageController.markRead.bind(messageController));
router.delete('/:id', messageController.deleteMessage.bind(messageController));

export default router;
