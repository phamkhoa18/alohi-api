const router = require('express').Router();
const userCtrl = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const userValidation = require('../validations/user.validation');
const { uploadAvatar, uploadCoverPhoto } = require('../middlewares/upload.middleware');
const { searchLimiter } = require('../middlewares/rateLimit.middleware');

// Profile
router.get('/me', verifyToken, userCtrl.getMe);
router.put('/me', verifyToken, validate(userValidation.updateProfile), userCtrl.updateMe);
router.put('/me/avatar', verifyToken, uploadAvatar, userCtrl.updateAvatar);
router.delete('/me/avatar', verifyToken, userCtrl.deleteAvatar);
router.put('/me/cover', verifyToken, uploadCoverPhoto, userCtrl.updateCoverPhoto);

// Settings
router.put('/me/settings/privacy', verifyToken, validate(userValidation.updatePrivacy), userCtrl.updatePrivacy);
router.put('/me/settings/notification', verifyToken, validate(userValidation.updateNotification), userCtrl.updateNotification);
router.put('/me/settings/chat', verifyToken, validate(userValidation.updateChatSettings), userCtrl.updateChatSettings);

// Search & discover
router.get('/search', verifyToken, searchLimiter, validate(userValidation.searchUsers), userCtrl.searchUsers);
router.get('/phone/:phone', verifyToken, userCtrl.findByPhone);
router.get('/blocked', verifyToken, userCtrl.getBlockedUsers);

// Block
router.post('/block/:userId', verifyToken, userCtrl.blockUser);
router.delete('/block/:userId', verifyToken, userCtrl.unblockUser);

// View other user profile
router.get('/:id', verifyToken, userCtrl.getUserById);

module.exports = router;
