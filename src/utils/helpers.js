const crypto = require('crypto');

/**
 * Generate a unique message ID
 */
const generateMessageId = () => `msg_${crypto.randomUUID().replace(/-/g, '')}`;

/**
 * Generate a unique call ID
 */
const generateCallId = () => `call_${crypto.randomUUID().replace(/-/g, '')}`;

/**
 * Generate a unique backup ID
 */
const generateBackupId = () => `bak_${crypto.randomUUID().replace(/-/g, '')}`;

/**
 * Generate a random invite link code
 */
const generateInviteLink = () => {
  return crypto.randomBytes(8).toString('base64url');
};

/**
 * Generate a 6-digit OTP code
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash a token for storage (SHA-256)
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Truncate text for preview
 */
const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
};

/**
 * Generate message preview by type
 */
const generateMessagePreview = (type, content, senderName) => {
  const previewMap = {
    text: truncateText(content, 100),
    image: '📷 Hình ảnh',
    video: '🎥 Video',
    audio: '🎤 Tin nhắn thoại',
    file: '📎 Tệp đính kèm',
    sticker: '🏷️ Sticker',
    gif: '🎞️ GIF',
    location: '📍 Vị trí',
    contact: '👤 Liên hệ',
    call: '📞 Cuộc gọi',
    system: content || 'Thông báo hệ thống',
  };
  return previewMap[type] || content || '';
};

/**
 * Sanitize phone number to +84 format
 */
const sanitizePhone = (phone) => {
  if (!phone) return null;
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('0')) {
    return '+84' + phone.slice(1);
  }
  if (phone.startsWith('84') && !phone.startsWith('+84')) {
    return '+' + phone;
  }
  return phone;
};

module.exports = {
  generateMessageId,
  generateCallId,
  generateBackupId,
  generateInviteLink,
  generateOTP,
  hashToken,
  generateRandomString,
  truncateText,
  generateMessagePreview,
  sanitizePhone,
};
