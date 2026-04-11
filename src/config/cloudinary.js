const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * Configure Cloudinary
 */
const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info('✅ Cloudinary configured');
  return cloudinary;
};

module.exports = { cloudinary, configureCloudinary };
