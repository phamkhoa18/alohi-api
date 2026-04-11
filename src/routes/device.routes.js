const router = require('express').Router();
const deviceCtrl = require('../controllers/device.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, deviceCtrl.getDevices);
router.get('/current', verifyToken, deviceCtrl.getCurrentDevice);
router.put('/:deviceId/rename', verifyToken, deviceCtrl.renameDevice);
router.delete('/:deviceId', verifyToken, deviceCtrl.removeDevice);
router.delete('/others', verifyToken, deviceCtrl.removeOtherDevices);
router.put('/:deviceId/fcm-token', verifyToken, deviceCtrl.updateFcmToken);

module.exports = router;
