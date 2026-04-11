const router = require('express').Router();
const convCtrl = require('../controllers/conversation.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, convCtrl.getConversations);
router.get('/pinned', verifyToken, convCtrl.getPinnedConversations);
router.get('/archived', verifyToken, convCtrl.getArchivedConversations);
router.get('/:id', verifyToken, convCtrl.getConversation);
router.post('/', verifyToken, convCtrl.createConversation);
router.put('/:id/mute', verifyToken, convCtrl.muteConversation);
router.put('/:id/unmute', verifyToken, convCtrl.unmuteConversation);
router.put('/:id/pin', verifyToken, convCtrl.pinConversation);
router.put('/:id/unpin', verifyToken, convCtrl.unpinConversation);
router.put('/:id/archive', verifyToken, convCtrl.archiveConversation);
router.put('/:id/unarchive', verifyToken, convCtrl.unarchiveConversation);
router.put('/:id/hide', verifyToken, convCtrl.hideConversation);
router.delete('/:id', verifyToken, convCtrl.deleteConversation);
router.put('/:id/clear-history', verifyToken, convCtrl.clearHistory);
router.get('/:id/members', verifyToken, convCtrl.getMembers);

module.exports = router;
