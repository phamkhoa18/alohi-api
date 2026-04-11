const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// Base upload directory
const UPLOAD_BASE = path.join(process.cwd(), 'uploads');

// Sub-directories for organized storage
const UPLOAD_DIRS = {
  avatars: path.join(UPLOAD_BASE, 'avatars'),
  avatarThumbs: path.join(UPLOAD_BASE, 'avatars', 'thumbs'),
  covers: path.join(UPLOAD_BASE, 'covers'),
  chatImages: path.join(UPLOAD_BASE, 'chat', 'images'),
  chatImageThumbs: path.join(UPLOAD_BASE, 'chat', 'images', 'thumbs'),
  chatVideos: path.join(UPLOAD_BASE, 'chat', 'videos'),
  chatAudio: path.join(UPLOAD_BASE, 'chat', 'audio'),
  chatFiles: path.join(UPLOAD_BASE, 'chat', 'files'),
  stories: path.join(UPLOAD_BASE, 'stories'),
  storyThumbs: path.join(UPLOAD_BASE, 'stories', 'thumbs'),
  stickers: path.join(UPLOAD_BASE, 'stickers'),
  temp: path.join(UPLOAD_BASE, 'temp'),
};

/**
 * Ensure all upload directories exist
 */
const ensureUploadDirs = () => {
  Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  logger.info('✅ Upload directories ready');
};

// Initialize on load
ensureUploadDirs();

/**
 * Generate a unique filename
 */
const generateFilename = (ext = '.webp') => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const id = crypto.randomUUID();
  return `${date}_${id}${ext}`;
};

/**
 * Build public URL from file path
 */
const toPublicUrl = (filePath) => {
  const relative = path.relative(UPLOAD_BASE, filePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
};

/**
 * Get file info (size, etc.)
 */
const getFileInfo = async (filePath) => {
  const stat = await fsp.stat(filePath);
  return { fileSize: stat.size };
};

class UploadService {

  // ─── AVATAR ────────────────────────────────────────────────────────

  /**
   * Upload avatar with automatic thumbnail generation
   * Main: 400x400 WebP | Thumb: 100x100 WebP
   */
  async uploadAvatar(filePath) {
    try {
      const filename = generateFilename();
      const mainPath = path.join(UPLOAD_DIRS.avatars, filename);
      const thumbPath = path.join(UPLOAD_DIRS.avatarThumbs, filename);

      // Main avatar — 400x400, high quality
      const mainInfo = await sharp(filePath)
        .resize(400, 400, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toFile(mainPath);

      // Thumbnail — 100x100, lower quality for fast loading
      await sharp(filePath)
        .resize(100, 100, { fit: 'cover', position: 'centre' })
        .webp({ quality: 70 })
        .toFile(thumbPath);

      this._cleanupTemp(filePath);

      return {
        url: toPublicUrl(mainPath),
        thumbnailUrl: toPublicUrl(thumbPath),
        filename,
        width: mainInfo.width,
        height: mainInfo.height,
        fileSize: mainInfo.size,
        format: 'webp',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Avatar upload error:', error.message);
      throw ApiError.internal('Lỗi upload avatar');
    }
  }

  // ─── COVER PHOTO ───────────────────────────────────────────────────

  /**
   * Upload cover photo — max 1200px wide, auto height
   */
  async uploadCoverPhoto(filePath) {
    try {
      const filename = generateFilename();
      const outputPath = path.join(UPLOAD_DIRS.covers, filename);

      const info = await sharp(filePath)
        .resize(1200, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outputPath);

      this._cleanupTemp(filePath);

      return {
        url: toPublicUrl(outputPath),
        filename,
        width: info.width,
        height: info.height,
        fileSize: info.size,
        format: 'webp',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Cover photo upload error:', error.message);
      throw ApiError.internal('Lỗi upload ảnh bìa');
    }
  }

  // ─── CHAT IMAGE ────────────────────────────────────────────────────

  /**
   * Upload chat image with thumbnail
   * Main: max 2048px wide, WebP | Thumb: 200x200
   */
  async uploadChatImage(filePath) {
    try {
      const filename = generateFilename();
      const mainPath = path.join(UPLOAD_DIRS.chatImages, filename);
      const thumbPath = path.join(UPLOAD_DIRS.chatImageThumbs, filename);

      // Main image — preserve aspect ratio, max 2048px
      const mainInfo = await sharp(filePath)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(mainPath);

      // Thumbnail
      await sharp(filePath)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 60 })
        .toFile(thumbPath);

      this._cleanupTemp(filePath);

      return {
        url: toPublicUrl(mainPath),
        thumbnailUrl: toPublicUrl(thumbPath),
        filename,
        width: mainInfo.width,
        height: mainInfo.height,
        fileSize: mainInfo.size,
        format: 'webp',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Chat image upload error:', error.message);
      throw ApiError.internal('Lỗi upload ảnh chat');
    }
  }

  // ─── CHAT VIDEO ────────────────────────────────────────────────────

  /**
   * Upload chat video (move to organized folder, no transcoding)
   */
  async uploadChatVideo(filePath) {
    try {
      const ext = path.extname(filePath) || '.mp4';
      const filename = generateFilename(ext);
      const outputPath = path.join(UPLOAD_DIRS.chatVideos, filename);

      await fsp.rename(filePath, outputPath);
      const { fileSize } = await getFileInfo(outputPath);

      return {
        url: toPublicUrl(outputPath),
        filename,
        fileSize,
        format: ext.replace('.', ''),
        resourceType: 'video',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Chat video upload error:', error.message);
      throw ApiError.internal('Lỗi upload video');
    }
  }

  // ─── AUDIO / VOICE MESSAGE ────────────────────────────────────────

  /**
   * Upload audio/voice message
   */
  async uploadAudio(filePath) {
    try {
      const ext = path.extname(filePath) || '.ogg';
      const filename = generateFilename(ext);
      const outputPath = path.join(UPLOAD_DIRS.chatAudio, filename);

      await fsp.rename(filePath, outputPath);
      const { fileSize } = await getFileInfo(outputPath);

      return {
        url: toPublicUrl(outputPath),
        filename,
        fileSize,
        format: ext.replace('.', ''),
        resourceType: 'audio',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Audio upload error:', error.message);
      throw ApiError.internal('Lỗi upload audio');
    }
  }

  // ─── GENERAL FILE ─────────────────────────────────────────────────

  /**
   * Upload any file (documents, zip, etc.)
   */
  async uploadFile(filePath, originalName) {
    try {
      const ext = path.extname(originalName || filePath);
      const filename = generateFilename(ext);
      const outputPath = path.join(UPLOAD_DIRS.chatFiles, filename);

      await fsp.rename(filePath, outputPath);
      const { fileSize } = await getFileInfo(outputPath);

      return {
        url: toPublicUrl(outputPath),
        filename,
        originalName: originalName || filename,
        fileSize,
        format: ext.replace('.', ''),
        resourceType: 'file',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('File upload error:', error.message);
      throw ApiError.internal('Lỗi upload file');
    }
  }

  // ─── STORY MEDIA ──────────────────────────────────────────────────

  /**
   * Upload story image or video
   */
  async uploadStoryMedia(filePath, type) {
    try {
      if (type === 'image') {
        const filename = generateFilename();
        const mainPath = path.join(UPLOAD_DIRS.stories, filename);
        const thumbPath = path.join(UPLOAD_DIRS.storyThumbs, filename);

        // Story image — 1080x1920 max (9:16 aspect for mobile)
        const mainInfo = await sharp(filePath)
          .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(mainPath);

        // Story thumbnail
        await sharp(filePath)
          .resize(200, 360, { fit: 'cover' })
          .webp({ quality: 60 })
          .toFile(thumbPath);

        this._cleanupTemp(filePath);

        return {
          url: toPublicUrl(mainPath),
          thumbnailUrl: toPublicUrl(thumbPath),
          filename,
          width: mainInfo.width,
          height: mainInfo.height,
          fileSize: mainInfo.size,
          format: 'webp',
          resourceType: 'image',
        };
      }

      // Video story
      const ext = path.extname(filePath) || '.mp4';
      const filename = generateFilename(ext);
      const outputPath = path.join(UPLOAD_DIRS.stories, filename);

      await fsp.rename(filePath, outputPath);
      const { fileSize } = await getFileInfo(outputPath);

      return {
        url: toPublicUrl(outputPath),
        filename,
        fileSize,
        format: ext.replace('.', ''),
        resourceType: 'video',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Story upload error:', error.message);
      throw ApiError.internal('Lỗi upload story');
    }
  }

  // ─── STICKER ──────────────────────────────────────────────────────

  /**
   * Upload sticker — optimized small PNG/WebP
   */
  async uploadSticker(filePath) {
    try {
      const filename = generateFilename('.webp');
      const outputPath = path.join(UPLOAD_DIRS.stickers, filename);

      const info = await sharp(filePath)
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 6 })
        .toFile(outputPath);

      this._cleanupTemp(filePath);

      return {
        url: toPublicUrl(outputPath),
        filename,
        width: info.width,
        height: info.height,
        fileSize: info.size,
        format: 'webp',
      };
    } catch (error) {
      this._cleanupTemp(filePath);
      logger.error('Sticker upload error:', error.message);
      throw ApiError.internal('Lỗi upload sticker');
    }
  }

  // ─── DELETE FILE ──────────────────────────────────────────────────

  /**
   * Delete a file by its public URL path (e.g. /uploads/avatars/xxx.webp)
   */
  async deleteFile(urlPath) {
    try {
      // Convert URL path → absolute file path
      const relativePath = urlPath.replace(/^\/uploads\//, '');
      const absolutePath = path.join(UPLOAD_BASE, relativePath);

      // Security: prevent path traversal
      if (!absolutePath.startsWith(UPLOAD_BASE)) {
        throw ApiError.badRequest('Đường dẫn không hợp lệ');
      }

      if (fs.existsSync(absolutePath)) {
        await fsp.unlink(absolutePath);
        logger.info(`Deleted file: ${relativePath}`);
      }

      // Also try to delete thumbnail if exists
      const dir = path.dirname(relativePath);
      const basename = path.basename(relativePath);
      const thumbPath = path.join(UPLOAD_BASE, dir, 'thumbs', basename);
      if (fs.existsSync(thumbPath)) {
        await fsp.unlink(thumbPath);
        logger.info(`Deleted thumbnail: ${dir}/thumbs/${basename}`);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('File delete error:', error.message);
    }
  }

  // ─── MULTIPLE FILES ───────────────────────────────────────────────

  /**
   * Upload multiple files — auto-detect type (image vs file)
   */
  async uploadMultiple(files) {
    const results = [];

    for (const file of files) {
      const isImage = file.mimetype?.startsWith('image/');

      if (isImage) {
        const result = await this.uploadChatImage(file.path);
        results.push(result);
      } else {
        const result = await this.uploadFile(file.path, file.originalname);
        results.push(result);
      }
    }

    return results;
  }

  // ─── UTILITY ──────────────────────────────────────────────────────

  /**
   * Clean up temporary file (silent fail)
   */
  _cleanupTemp(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.error('Cleanup error:', error.message);
    }
  }
}

module.exports = new UploadService();
