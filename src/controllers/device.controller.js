const DeviceSession = require('../models/DeviceSession');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

exports.getDevices = asyncHandler(async (req, res) => {
  const devices = await DeviceSession.find({ user: req.user._id, isActive: true })
    .sort({ lastActiveAt: -1 });
  new ApiResponse(200, 'Success', devices).send(res);
});

exports.getCurrentDevice = asyncHandler(async (req, res) => {
  const device = await DeviceSession.findOne({ user: req.user._id, deviceId: req.deviceId });
  new ApiResponse(200, 'Success', device).send(res);
});

exports.renameDevice = asyncHandler(async (req, res) => {
  await DeviceSession.findOneAndUpdate(
    { user: req.user._id, deviceId: req.params.deviceId },
    { deviceName: req.body.name }
  );
  new ApiResponse(200, 'Đã đổi tên thiết bị').send(res);
});

exports.removeDevice = asyncHandler(async (req, res) => {
  await DeviceSession.findOneAndUpdate(
    { user: req.user._id, deviceId: req.params.deviceId },
    { isActive: false, logoutAt: new Date() }
  );

  // Remove refresh token for this device
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { refreshTokens: { deviceId: req.params.deviceId } },
  });

  new ApiResponse(200, 'Đã đăng xuất thiết bị').send(res);
});

exports.removeOtherDevices = asyncHandler(async (req, res) => {
  await DeviceSession.updateMany(
    { user: req.user._id, deviceId: { $ne: req.deviceId }, isActive: true },
    { isActive: false, logoutAt: new Date() }
  );

  const User = require('../models/User');
  const user = await User.findById(req.user._id);
  user.refreshTokens = user.refreshTokens.filter(rt => rt.deviceId === req.deviceId);
  await user.save();

  new ApiResponse(200, 'Đã đăng xuất tất cả thiết bị khác').send(res);
});

exports.updateFcmToken = asyncHandler(async (req, res) => {
  await DeviceSession.findOneAndUpdate(
    { user: req.user._id, deviceId: req.params.deviceId },
    { fcmToken: req.body.fcmToken }
  );
  new ApiResponse(200, 'Đã cập nhật FCM token').send(res);
});
