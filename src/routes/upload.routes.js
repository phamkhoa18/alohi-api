const router = require('express').Router();
const uploadService = require('../services/upload.service');
const { verifyToken } = require('../middlewares/auth.middleware');
const { uploadChatImage, uploadChatVideo, uploadVoiceMessage, uploadFile, uploadMultiple } = require('../middlewares/upload.middleware');
const { uploadLimiter } = require('../middlewares/rateLimit.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

router.post('/image', verifyToken, uploadLimiter, uploadChatImage, asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn ảnh');
  const result = await uploadService.uploadChatImage(req.file.path);
  new ApiResponse(201, 'Upload thành công', result).send(res);
}));

router.post('/video', verifyToken, uploadLimiter, uploadChatVideo, asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn video');
  const result = await uploadService.uploadChatVideo(req.file.path);
  new ApiResponse(201, 'Upload thành công', result).send(res);
}));

router.post('/audio', verifyToken, uploadLimiter, uploadVoiceMessage, asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn audio');
  const result = await uploadService.uploadAudio(req.file.path);
  new ApiResponse(201, 'Upload thành công', result).send(res);
}));

router.post('/file', verifyToken, uploadLimiter, uploadFile, asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn file');
  const result = await uploadService.uploadFile(req.file.path, req.file.originalname);
  new ApiResponse(201, 'Upload thành công', result).send(res);
}));

router.post('/multiple', verifyToken, uploadLimiter, uploadMultiple, asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Vui lòng chọn file');
  const results = await uploadService.uploadMultiple(req.files);
  new ApiResponse(201, `Upload ${results.length} file thành công`, results).send(res);
}));

router.delete('/', verifyToken, asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) throw ApiError.badRequest('Thiếu URL file cần xóa');
  await uploadService.deleteFile(url);
  new ApiResponse(200, 'Đã xóa file').send(res);
}));

module.exports = router;
