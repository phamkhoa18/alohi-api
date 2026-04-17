const router = require('express').Router();
const authCtrl = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const authValidation = require('../validations/auth.validation');
const { authOtpLimiter, authLoginLimiter, authRegisterLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/check-phone', authCtrl.checkPhone);
router.post('/send-otp', authOtpLimiter, validate(authValidation.sendOtp), authCtrl.sendOTP);
router.post('/verify-otp', validate(authValidation.verifyOtp), authCtrl.verifyOTP);
router.post('/register', authRegisterLimiter, validate(authValidation.register), authCtrl.register);
router.post('/login', authLoginLimiter, validate(authValidation.login), authCtrl.login);
router.post('/refresh-token', validate(authValidation.refreshToken), authCtrl.refreshToken);
router.post('/logout', verifyToken, authCtrl.logout);
router.post('/logout-all', verifyToken, authCtrl.logoutAll);
router.post('/forgot-password', authOtpLimiter, validate(authValidation.forgotPassword), authCtrl.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), authCtrl.resetPassword);
router.put('/change-password', verifyToken, validate(authValidation.changePassword), authCtrl.changePassword);
router.delete('/delete-account', verifyToken, authCtrl.deleteAccount);
router.get('/sessions', verifyToken, authCtrl.getSessions);
router.post('/sessions/:id/logout', verifyToken, authCtrl.logoutSession);

module.exports = router;
