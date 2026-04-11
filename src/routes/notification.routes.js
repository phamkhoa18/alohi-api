const router = require('express').Router();
const notifCtrl = require('../controllers/notification.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, notifCtrl.getNotifications);
router.get('/unread-count', verifyToken, notifCtrl.getUnreadCount);
router.put('/:id/read', verifyToken, notifCtrl.markRead);
router.put('/read-all', verifyToken, notifCtrl.markAllRead);
router.delete('/:id', verifyToken, notifCtrl.deleteNotification);
router.delete('/clear-all', verifyToken, notifCtrl.clearAll);

module.exports = router;
