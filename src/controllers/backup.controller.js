const backupService = require('../services/backup.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

exports.getStatus = asyncHandler(async (req, res) => {
  const status = await backupService.getStatus(req.user._id);
  new ApiResponse(200, 'Success', status).send(res);
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await backupService.updateSettings(req.user._id, req.body);
  new ApiResponse(200, 'Cập nhật cài đặt backup thành công', settings).send(res);
});

exports.createBackup = asyncHandler(async (req, res) => {
  const backup = await backupService.createBackup(req.user._id, req.body);
  new ApiResponse(201, 'Đã tạo backup', backup).send(res);
});

exports.listBackups = asyncHandler(async (req, res) => {
  const backups = await backupService.listBackups(req.user._id);
  new ApiResponse(200, 'Success', backups).send(res);
});

exports.restoreBackup = asyncHandler(async (req, res) => {
  const backup = await backupService.getBackup(req.user._id, req.params.backupId);
  new ApiResponse(200, 'Success', backup).send(res);
});

exports.deleteBackup = asyncHandler(async (req, res) => {
  await backupService.deleteBackup(req.user._id, req.params.backupId);
  new ApiResponse(200, 'Đã xóa backup').send(res);
});
