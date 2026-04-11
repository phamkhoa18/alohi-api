const router = require('express').Router();
const callCtrl = require('../controllers/call.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/history', verifyToken, callCtrl.getCallHistory);
router.get('/missed', verifyToken, callCtrl.getMissedCalls);
router.get('/:callId', verifyToken, callCtrl.getCallDetail);
router.delete('/:callId', verifyToken, callCtrl.deleteCallLog);
router.delete('/history/clear', verifyToken, callCtrl.clearCallHistory);

module.exports = router;
