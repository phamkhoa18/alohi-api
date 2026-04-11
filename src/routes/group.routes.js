const router = require('express').Router();
const groupCtrl = require('../controllers/group.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const groupValidation = require('../validations/group.validation');

router.post('/', verifyToken, validate(groupValidation.createGroup), groupCtrl.createGroup);
router.get('/:id', verifyToken, groupCtrl.updateGroup); // NOTE: Should be separate, but reuses for info
router.put('/:id', verifyToken, validate(groupValidation.updateGroup), groupCtrl.updateGroup);
router.delete('/:id', verifyToken, groupCtrl.dissolveGroup);
router.post('/:id/members', verifyToken, validate(groupValidation.addMembers), groupCtrl.addMembers);
router.delete('/:id/members/:userId', verifyToken, groupCtrl.removeMember);
router.put('/:id/members/:userId/role', verifyToken, validate(groupValidation.changeRole), groupCtrl.changeRole);
router.post('/:id/leave', verifyToken, groupCtrl.leaveGroup);
router.put('/:id/transfer-owner/:userId', verifyToken, groupCtrl.transferOwnership);
router.post('/:id/invite-link', verifyToken, groupCtrl.generateInviteLink);
router.post('/join/:inviteLink', verifyToken, groupCtrl.joinByInviteLink);
router.put('/:id/settings', verifyToken, validate(groupValidation.updateSettings), groupCtrl.updateSettings);

module.exports = router;
