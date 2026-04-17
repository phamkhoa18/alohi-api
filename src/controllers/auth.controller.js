const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Check Phone
// @route   POST /api/auth/check-phone
exports.checkPhone = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const User = require('../models/User');
  const { sanitizePhone } = require('../utils/helpers');
  const user = await User.findOne({ phone: sanitizePhone(phone) });
  
  if (!user) {
    throw ApiError.notFound('Tài khoản chưa tồn tại');
  }
  
  new ApiResponse(200, 'Tài khoản hợp lệ', {
    displayName: user.displayName,
    avatar: user.avatar
  }).send(res);
});

// @desc    Send OTP
// @route   POST /api/auth/send-otp
exports.sendOTP = asyncHandler(async (req, res) => {
  const result = await otpService.sendOTP(req.body.phone);
  new ApiResponse(200, 'OTP đã được gửi', result).send(res);
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
exports.verifyOTP = asyncHandler(async (req, res) => {
  await otpService.verifyOTP(req.body.phone, req.body.code);
  new ApiResponse(200, 'OTP hợp lệ').send(res);
});

// @desc    Register
// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  new ApiResponse(201, 'Đăng ký thành công', { userId: user._id }).send(res);
});

// @desc    Login
// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  new ApiResponse(200, 'Đăng nhập thành công', result).send(res);
});

// @desc    Refresh Token
// @route   POST /api/auth/refresh-token
exports.refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  new ApiResponse(200, 'Token đã được làm mới', result).send(res);
});

// @desc    Logout
// @route   POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id, req.deviceId);
  new ApiResponse(200, 'Đăng xuất thành công').send(res);
});

// @desc    Logout all devices
// @route   POST /api/auth/logout-all
exports.logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  new ApiResponse(200, 'Đã đăng xuất khỏi tất cả thiết bị').send(res);
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  await otpService.sendOTP(req.body.phone);
  new ApiResponse(200, 'OTP đã được gửi để đặt lại mật khẩu').send(res);
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { phone, newPassword } = req.body;
  // await otpService.verifyOTP(phone, otpCode); // Handled by OtpScreen

  const User = require('../models/User');
  const user = await User.findOne({ phone: require('../utils/helpers').sanitizePhone(phone) });
  if (!user) throw ApiError.notFound('User không tồn tại');

  user.password = newPassword;
  user.refreshTokens = [];
  await user.save();

  new ApiResponse(200, 'Đặt lại mật khẩu thành công').send(res);
});

// @desc    Change Password
// @route   PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  new ApiResponse(200, 'Đổi mật khẩu thành công').send(res);
});

// @desc    Delete Account
// @route   DELETE /api/auth/delete-account
exports.deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user._id);
  new ApiResponse(200, 'Tài khoản đã được xóa').send(res);
});

// @desc    Get Active Sessions
// @route   GET /api/auth/sessions
exports.getSessions = asyncHandler(async (req, res) => {
  const DeviceSession = require('../models/DeviceSession');
  const sessions = await DeviceSession.find({ user: req.user._id, isActive: true })
    .select('-fcmToken')
    .sort({ lastActiveAt: -1 });
  new ApiResponse(200, 'Danh sách thiết bị đăng nhập', sessions).send(res);
});

// @desc    Logout specific session
// @route   POST /api/auth/sessions/:id/logout
exports.logoutSession = asyncHandler(async (req, res) => {
  const DeviceSession = require('../models/DeviceSession');
  const session = await DeviceSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) throw ApiError.notFound('Phiên đăng nhập không tồn tại');
  
  session.isActive = false;
  session.logoutAt = new Date();
  await session.save();

  // Optionally remove the refresh token from the User document
  const User = require('../models/User');
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { refreshTokens: { deviceId: session.deviceId } } }
  );

  new ApiResponse(200, 'Đã đăng xuất thiết bị').send(res);
});
