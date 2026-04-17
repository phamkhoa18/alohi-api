const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { UPLOAD_LIMITS } = require('../config/constants');

// Temp storage — files land here first, then upload.service.js moves them
const tempDir = path.join(process.cwd(), 'uploads', 'temp');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// MIME type whitelist
const ALLOWED_MIMES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  audio: ['audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'],
  file: null, // allow all for files
};

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (!allowedTypes) {
    return cb(null, true); // Allow all
  }
  
  const isGenericImage = file.mimetype === 'image/*' && allowedTypes.some(t => t.startsWith('image/'));
  const isGenericVideo = file.mimetype === 'video/*' && allowedTypes.some(t => t.startsWith('video/'));
  const isGenericAudio = file.mimetype === 'audio/*' && allowedTypes.some(t => t.startsWith('audio/'));
  const isOctetStream = file.mimetype === 'application/octet-stream';

  if (allowedTypes.includes(file.mimetype) || isGenericImage || isGenericVideo || isGenericAudio || isOctetStream) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Định dạng file không hỗ trợ: ${file.mimetype}`), false);
  }
};

// === Upload Middlewares ===

const uploadAvatar = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.AVATAR },
  fileFilter: fileFilter(ALLOWED_MIMES.image),
}).single('avatar');

const uploadCoverPhoto = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.COVER_PHOTO },
  fileFilter: fileFilter(ALLOWED_MIMES.image),
}).single('coverPhoto');

const uploadChatImage = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.CHAT_IMAGE },
  fileFilter: fileFilter(ALLOWED_MIMES.image),
}).single('image');

const uploadChatVideo = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.CHAT_VIDEO },
  fileFilter: fileFilter(ALLOWED_MIMES.video),
}).single('video');

const uploadVoiceMessage = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.VOICE_MESSAGE },
  fileFilter: fileFilter(ALLOWED_MIMES.audio),
}).single('audio');

const uploadFile = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.FILE },
  fileFilter: fileFilter(null),
}).single('file');

const uploadMultiple = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.FILE, files: 10 },
  fileFilter: fileFilter(null),
}).array('files', 10);

const uploadStory = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.STORY_VIDEO },
  fileFilter: fileFilter([...ALLOWED_MIMES.image, ...ALLOWED_MIMES.video, ...ALLOWED_MIMES.audio]),
}).fields([
  { name: 'media', maxCount: 1 },
  { name: 'music', maxCount: 1 }
]);

// Multer error handler wrapper
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File quá lớn'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(ApiError.badRequest('Số lượng file vượt quá giới hạn'));
      }
      return next(ApiError.badRequest(err.message));
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = {
  uploadAvatar: handleUpload(uploadAvatar),
  uploadCoverPhoto: handleUpload(uploadCoverPhoto),
  uploadChatImage: handleUpload(uploadChatImage),
  uploadChatVideo: handleUpload(uploadChatVideo),
  uploadVoiceMessage: handleUpload(uploadVoiceMessage),
  uploadFile: handleUpload(uploadFile),
  uploadMultiple: handleUpload(uploadMultiple),
  uploadStory: handleUpload(uploadStory),
};
