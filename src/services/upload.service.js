const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class UploadService {
  /**
   * Upload file to Cloudinary
   */
  async uploadToCloudinary(filePath, options = {}) {
    const {
      folder = 'alohi',
      resourceType = 'auto',
      transformation = [],
      maxWidth,
      maxHeight,
      quality,
    } = options;

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      unique_filename: true,
      overwrite: false,
    };

    if (transformation.length > 0) {
      uploadOptions.transformation = transformation;
    }

    if (maxWidth || maxHeight) {
      uploadOptions.transformation = uploadOptions.transformation || [];
      uploadOptions.transformation.push({
        width: maxWidth,
        height: maxHeight,
        crop: 'limit',
        quality: quality || 'auto',
      });
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      // Clean up temp file
      this.cleanupTempFile(filePath);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        fileSize: result.bytes,
        format: result.format,
        resourceType: result.resource_type,
        duration: result.duration,
      };
    } catch (error) {
      this.cleanupTempFile(filePath);
      logger.error('Cloudinary upload error:', error.message);
      throw error;
    }
  }

  /**
   * Upload avatar with thumbnail
   */
  async uploadAvatar(filePath) {
    const main = await this.uploadToCloudinary(filePath, {
      folder: 'alohi/avatars',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'webp' },
      ],
    });

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(main.publicId, {
      width: 100,
      height: 100,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'webp',
    });

    return {
      url: main.url,
      publicId: main.publicId,
      thumbnailUrl,
    };
  }

  /**
   * Upload cover photo
   */
  async uploadCoverPhoto(filePath) {
    return this.uploadToCloudinary(filePath, {
      folder: 'alohi/covers',
      maxWidth: 1200,
      maxHeight: 400,
      quality: 'auto',
    });
  }

  /**
   * Upload chat image
   */
  async uploadChatImage(filePath) {
    const main = await this.uploadToCloudinary(filePath, {
      folder: 'alohi/chat/images',
      maxWidth: 2048,
      quality: 80,
    });

    const thumbnailUrl = cloudinary.url(main.publicId, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'webp',
    });

    return { ...main, thumbnailUrl };
  }

  /**
   * Upload chat video
   */
  async uploadChatVideo(filePath) {
    const result = await this.uploadToCloudinary(filePath, {
      folder: 'alohi/chat/videos',
      resourceType: 'video',
      transformation: [
        { quality: 'auto', fetch_format: 'mp4' },
      ],
    });

    // Generate video thumbnail
    const thumbnailUrl = cloudinary.url(result.publicId, {
      resource_type: 'video',
      width: 320,
      height: 240,
      crop: 'fill',
      format: 'jpg',
    });

    return { ...result, thumbnailUrl };
  }

  /**
   * Upload audio/voice message
   */
  async uploadAudio(filePath) {
    return this.uploadToCloudinary(filePath, {
      folder: 'alohi/chat/audio',
      resourceType: 'video', // Cloudinary uses 'video' for audio
    });
  }

  /**
   * Upload general file
   */
  async uploadFile(filePath, originalName) {
    return this.uploadToCloudinary(filePath, {
      folder: 'alohi/chat/files',
      resourceType: 'raw',
    });
  }

  /**
   * Upload story media
   */
  async uploadStoryMedia(filePath, type) {
    if (type === 'image') {
      const result = await this.uploadToCloudinary(filePath, {
        folder: 'alohi/stories',
        transformation: [
          { width: 1080, height: 1920, crop: 'limit' },
          { quality: 'auto', fetch_format: 'webp' },
        ],
      });

      const thumbnailUrl = cloudinary.url(result.publicId, {
        width: 200,
        height: 360,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'webp',
      });

      return { ...result, thumbnailUrl };
    }

    // Video story
    return this.uploadToCloudinary(filePath, {
      folder: 'alohi/stories',
      resourceType: 'video',
      transformation: [
        { duration: '30', quality: 'auto' },
      ],
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFromCloudinary(publicId, resourceType = 'image') {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      logger.info(`Deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      logger.error('Cloudinary delete error:', error.message);
    }
  }

  /**
   * Clean up temp file
   */
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.error('Cleanup error:', error.message);
    }
  }
}

module.exports = new UploadService();
