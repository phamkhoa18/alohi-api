const router = require('express').Router();
const friendCtrl = require('../controllers/friend.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, friendCtrl.getFriends);
router.get('/online', verifyToken, friendCtrl.getOnlineFriends);
router.get('/count', verifyToken, friendCtrl.getFriendCount);
router.post('/request/:userId', verifyToken, friendCtrl.sendRequest);
router.get('/requests/received', verifyToken, friendCtrl.getReceivedRequests);
router.get('/requests/sent', verifyToken, friendCtrl.getSentRequests);
router.get('/requests/count', verifyToken, friendCtrl.getRequestCount);
router.put('/request/:requestId/accept', verifyToken, friendCtrl.acceptRequest);
router.put('/request/:requestId/reject', verifyToken, friendCtrl.rejectRequest);
router.delete('/request/:requestId', verifyToken, friendCtrl.cancelRequest);
router.delete('/:userId', verifyToken, friendCtrl.unfriend);
router.get('/suggestions', verifyToken, friendCtrl.getSuggestions);
router.post('/sync-contacts', verifyToken, friendCtrl.syncContacts);
router.get('/mutual/:userId', verifyToken, friendCtrl.getMutualFriends);

module.exports = router;
