const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

exports.getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.user._id, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20);
  new ApiResponse(200, 'Success', result).send(res);
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  new ApiResponse(200, 'Success', { unreadCount: count }).send(res);
});

exports.markRead = asyncHandler(async (req, res) => {
  await notificationService.markRead(req.params.id, req.user._id);
  new ApiResponse(200, 'Đã đánh dấu đã đọc').send(res);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  new ApiResponse(200, 'Đã đánh dấu tất cả đã đọc').send(res);
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);
  new ApiResponse(200, 'Đã xóa thông báo').send(res);
});

exports.clearAll = asyncHandler(async (req, res) => {
  await notificationService.clearAll(req.user._id);
  new ApiResponse(200, 'Đã xóa tất cả thông báo').send(res);
});
