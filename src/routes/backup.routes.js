const router = require('express').Router();
const backupCtrl = require('../controllers/backup.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/status', verifyToken, backupCtrl.getStatus);
router.put('/settings', verifyToken, backupCtrl.updateSettings);
router.post('/create', verifyToken, backupCtrl.createBackup);
router.get('/list', verifyToken, backupCtrl.listBackups);
router.post('/restore/:backupId', verifyToken, backupCtrl.restoreBackup);
router.delete('/:backupId', verifyToken, backupCtrl.deleteBackup);

module.exports = router;
