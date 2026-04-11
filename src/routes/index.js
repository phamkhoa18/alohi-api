const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/friends', require('./friend.routes'));
router.use('/conversations', require('./conversation.routes'));
router.use('/messages', require('./message.routes'));
router.use('/groups', require('./group.routes'));
router.use('/stories', require('./story.routes'));
router.use('/calls', require('./call.routes'));
router.use('/backup', require('./backup.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/stickers', require('./sticker.routes'));
router.use('/devices', require('./device.routes'));
router.use('/upload', require('./upload.routes'));

module.exports = router;
