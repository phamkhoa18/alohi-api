/**
 * App-wide constants
 */
module.exports = {
  // === Message Types ===
  MESSAGE_TYPES: ['text', 'image', 'video', 'audio', 'file', 'sticker', 'gif', 'location', 'contact', 'system', 'call'],

  // === Message Status ===
  MESSAGE_STATUS: {
    QUEUED: 'queued',
    DELIVERING: 'delivering',
    DELIVERED: 'delivered',
    FAILED: 'failed',
    EXPIRED: 'expired',
  },

  // === Conversation Types ===
  CONVERSATION_TYPES: {
    PRIVATE: 'private',
    GROUP: 'group',
  },

  // === Group Roles ===
  GROUP_ROLES: {
    OWNER: 'owner',
    ADMIN: 'admin',
    CO_ADMIN: 'co-admin',
    MEMBER: 'member',
  },

  // === Friend Request Status ===
  FRIEND_REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    BLOCKED: 'blocked',
  },

  // === User Status ===
  USER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
    DEACTIVATED: 'deactivated',
  },

  // === Call Types ===
  CALL_TYPES: {
    VOICE: 'voice',
    VIDEO: 'video',
  },

  // === Call Status ===
  CALL_STATUS: {
    RINGING: 'ringing',
    ANSWERED: 'answered',
    REJECTED: 'rejected',
    MISSED: 'missed',
    CANCELLED: 'cancelled',
    BUSY: 'busy',
    FAILED: 'failed',
    NO_ANSWER: 'no_answer',
  },

  // === Story Privacy ===
  STORY_PRIVACY: {
    PUBLIC: 'public',
    FRIENDS: 'friends',
    CLOSE_FRIENDS: 'close_friends',
    CUSTOM: 'custom',
    ONLY_ME: 'only_me',
  },

  // === Upload Limits (bytes) ===
  UPLOAD_LIMITS: {
    AVATAR: 5 * 1024 * 1024,         // 5 MB
    COVER_PHOTO: 10 * 1024 * 1024,    // 10 MB
    CHAT_IMAGE: 10 * 1024 * 1024,     // 10 MB
    CHAT_VIDEO: 500 * 1024 * 1024,    // 500 MB
    VOICE_MESSAGE: 20 * 1024 * 1024,  // 20 MB
    FILE: 200 * 1024 * 1024,          // 200 MB
    STORY_IMAGE: 20 * 1024 * 1024,    // 20 MB
    STORY_VIDEO: 200 * 1024 * 1024,   // 200 MB
    STICKER: 1024 * 1024,             // 1 MB
  },

  // === Timeouts (ms) ===
  TIMEOUTS: {
    CALL_RING: 30000,           // 30s for call ringing
    TYPING_INDICATOR: 5000,     // 5s auto-stop typing
    HEARTBEAT_INTERVAL: 30000,  // 30s heartbeat
    PRESENCE_TTL: 60,           // 60s Redis TTL
    APP_FOREGROUND_TTL: 30,     // 30s
    MESSAGE_QUEUE_TTL: 30 * 24 * 60 * 60, // 30 days in seconds
    OTP_TTL: 300,               // 5 minutes
  },

  // === Pagination ===
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // === Redis Key Prefixes ===
  REDIS_KEYS: {
    USER_ONLINE: (userId) => `user:${userId}:online`,
    USER_LAST_SEEN: (userId) => `user:${userId}:lastSeen`,
    USER_SOCKETS: (userId) => `user:${userId}:sockets`,
    USER_ACTIVE_CALL: (userId) => `user:${userId}:activeCall`,
    USER_APP_FOREGROUND: (userId) => `user:${userId}:appForeground`,
    USER_CUSTOM_STATUS: (userId) => `user:${userId}:customStatus`,
    USER_TYPING: (userId, convId) => `user:${userId}:typing:${convId}`,
    QUEUE: (userId) => `queue:${userId}`,
    DEDUP: (convId) => `dedup:${convId}`,
    CALL: (callId) => `call:${callId}`,
    RATE_LIMIT: (type, key) => `rl:${type}:${key}`,
    SESSION: (userId, deviceId) => `session:${userId}:${deviceId}`,
    REFRESH_TOKEN: (tokenHash) => `refresh:${tokenHash}`,
    OTP: (phone) => `otp:${phone}`,
    CACHE_USER: (userId) => `cache:user:${userId}`,
    CACHE_CONV_LIST: (userId) => `cache:conv:${userId}:list`,
    CACHE_FRIENDS: (userId) => `cache:friends:${userId}`,
    SOCKET_USER: (socketId) => `socket:${socketId}:user`,
    ONLINE_FRIENDS: (userId) => `online:friends:${userId}`,
  },

  // === Notification Types ===
  NOTIFICATION_TYPES: [
    'friend_request', 'friend_accepted', 'friend_rejected',
    'new_message', 'missed_call', 'incoming_call', 'call_ended',
    'group_invite', 'group_member_added', 'group_member_removed',
    'group_role_changed', 'group_join_request',
    'story_reaction', 'story_reply', 'story_mention',
    'mention_in_chat',
    'system_update', 'security_alert',
  ],

  // === Report Reasons ===
  REPORT_REASONS: ['spam', 'harassment', 'inappropriate', 'fake_account', 'violence', 'scam', 'hate_speech', 'copyright', 'other'],

  // === Sticker Categories ===
  STICKER_CATEGORIES: ['emoji', 'character', 'cute', 'funny', 'love', 'seasonal', 'custom'],

  // === Platforms ===
  PLATFORMS: ['android', 'ios', 'web'],

  // === Gender ===
  GENDERS: ['male', 'female', 'other'],

  // === Privacy Visibility ===
  PROFILE_VISIBILITY: ['everyone', 'friends', 'nobody'],

  // === Backup Frequency ===
  BACKUP_FREQUENCY: ['daily', 'weekly', 'monthly', 'manual'],

  // === Backup Status ===
  BACKUP_STATUS: ['in_progress', 'completed', 'failed', 'expired'],

  // === Friend Request Sources ===
  FRIEND_REQUEST_SOURCES: ['search', 'phone', 'qrcode', 'group', 'suggestion', 'contact_sync'],

  // === Max Group Members ===
  MAX_GROUP_MEMBERS: 500,

  // === Recall Window ===
  RECALL_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
};
