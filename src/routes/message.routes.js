const router = require('express').Router();
const msgCtrl = require('../controllers/message.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const msgValidation = require('../validations/message.validation');
const { messageLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/:conversationId', verifyToken, messageLimiter, validate(msgValidation.sendMessage), msgCtrl.sendMessage);
router.put('/:messageId/recall', verifyToken, msgCtrl.recallMessage);
router.delete('/:messageId', verifyToken, msgCtrl.deleteMessage);
router.post('/:messageId/react', verifyToken, validate(msgValidation.reactMessage), msgCtrl.reactToMessage);
router.delete('/:messageId/react', verifyToken, msgCtrl.removeReaction);
router.post('/:messageId/forward', verifyToken, validate(msgValidation.forwardMessage), msgCtrl.forwardMessage);
router.post('/:conversationId/pin/:messageId', verifyToken, msgCtrl.pinMessage);
router.delete('/:conversationId/pin/:messageId', verifyToken, msgCtrl.unpinMessage);

module.exports = router;
