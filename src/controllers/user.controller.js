const userService = require('../services/user.service');
const uploadService = require('../services/upload.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get my profile
// @route   GET /api/users/me
exports.getMe = asyncHandler(async (req, res) => {
  const profile = await userService.getUserById(req.user._id, req.user._id);
  new ApiResponse(200, 'Success', profile).send(res);
});

// @desc    Update my profile
// @route   PUT /api/users/me
exports.updateMe = asyncHandler(async (req, res) => {
  const profile = await userService.updateProfile(req.user._id, req.body);
  new ApiResponse(200, 'Cập nhật profile thành công', profile).send(res);
});

// @desc    Update avatar
// @route   PUT /api/users/me/avatar
exports.updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn ảnh');
  const avatarData = await uploadService.uploadAvatar(req.file.path);
  const profile = await userService.updateAvatar(req.user._id, avatarData);
  new ApiResponse(200, 'Cập nhật avatar thành công', profile).send(res);
});

// @desc    Delete avatar
// @route   DELETE /api/users/me/avatar
exports.deleteAvatar = asyncHandler(async (req, res) => {
  const profile = await userService.deleteAvatar(req.user._id);
  new ApiResponse(200, 'Đã xóa avatar', profile).send(res);
});

// @desc    Update cover photo
// @route   PUT /api/users/me/cover
exports.updateCoverPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn ảnh bìa');
  const coverData = await uploadService.uploadCoverPhoto(req.file.path);
  const profile = await userService.updateCoverPhoto(req.user._id, coverData);
  new ApiResponse(200, 'Cập nhật ảnh bìa thành công', profile).send(res);
});

// @desc    Update privacy settings
// @route   PUT /api/users/me/settings/privacy
exports.updatePrivacy = asyncHandler(async (req, res) => {
  const profile = await userService.updatePrivacy(req.user._id, req.body);
  new ApiResponse(200, 'Cập nhật cài đặt riêng tư thành công', profile).send(res);
});

// @desc    Update notification settings
// @route   PUT /api/users/me/settings/notification
exports.updateNotification = asyncHandler(async (req, res) => {
  const profile = await userService.updateNotificationSettings(req.user._id, req.body);
  new ApiResponse(200, 'Cập nhật cài đặt thông báo thành công', profile).send(res);
});

// @desc    Update chat settings
// @route   PUT /api/users/me/settings/chat
exports.updateChatSettings = asyncHandler(async (req, res) => {
  const profile = await userService.updateChatSettings(req.user._id, req.body);
  new ApiResponse(200, 'Cập nhật cài đặt chat thành công', profile).send(res);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
exports.getUserById = asyncHandler(async (req, res) => {
  const profile = await userService.getUserById(req.params.id, req.user._id);
  new ApiResponse(200, 'Success', profile).send(res);
});

// @desc    Search users
// @route   GET /api/users/search
exports.searchUsers = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await userService.searchUsers(q, req.user._id, parseInt(page), parseInt(limit));
  ApiResponse.paginated(result.users, result.pagination).send(res);
});

// @desc    Find by phone
// @route   GET /api/users/phone/:phone
exports.findByPhone = asyncHandler(async (req, res) => {
  const profile = await userService.findByPhone(req.params.phone, req.user._id);
  new ApiResponse(200, 'Success', profile).send(res);
});

// @desc    Block user
// @route   POST /api/users/block/:userId
exports.blockUser = asyncHandler(async (req, res) => {
  await userService.blockUser(req.user._id, req.params.userId);
  new ApiResponse(200, 'Đã chặn user').send(res);
});

// @desc    Unblock user
// @route   DELETE /api/users/block/:userId
exports.unblockUser = asyncHandler(async (req, res) => {
  await userService.unblockUser(req.user._id, req.params.userId);
  new ApiResponse(200, 'Đã bỏ chặn user').send(res);
});

// @desc    Get blocked users
// @route   GET /api/users/blocked
exports.getBlockedUsers = asyncHandler(async (req, res) => {
  const blockedUsers = await userService.getBlockedUsers(req.user._id);
  new ApiResponse(200, 'Success', blockedUsers).send(res);
});
