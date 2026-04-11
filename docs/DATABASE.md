# 🗃 Database Schema Documentation

## Tổng Quan

Alohi sử dụng **MongoDB** cho persistent storage và **Redis** cho real-time state.

### Nguyên tắc thiết kế

1. **Local-First**: Server **KHÔNG** lưu nội dung tin nhắn. Chỉ lưu metadata (sender, type, timestamp, preview).
2. **Embedded Documents**: Sử dụng embedded thay vì reference khi dữ liệu luôn được truy vấn cùng nhau (ví dụ: participants trong Conversation).
3. **TTL Indexes**: Sử dụng MongoDB TTL để tự động xóa dữ liệu tạm (Message Queue: 30 ngày, Story: 24 giờ).
4. **Compound Indexes**: Tối ưu cho các truy vấn phổ biến.

---

## 📦 Models

### User

Thông tin người dùng, settings, danh sách bạn bè.

```javascript
{
  // Identity
  phone: String,              // Unique, +84 format
  password: String,            // bcrypt hash (select: false)
  displayName: String,         // 2-50 chars

  // Profile
  avatar: {
    url: String,
    publicId: String,          // Cloudinary public ID
    thumbnailUrl: String,
  },
  coverPhoto: { url, publicId },
  bio: String,                 // Max 200
  gender: "male" | "female" | "other",
  dateOfBirth: Date,
  customStatusText: String,    // Max 100
  customStatusEmoji: String,

  // Settings (embedded)
  settings: {
    privacy: {
      showPhone: Boolean,           // Default: false
      showDOB: Boolean,
      showLastSeen: Boolean,        // Default: true
      showOnlineStatus: Boolean,
      allowStrangerMessage: Boolean, // Default: false
      allowStrangerCall: Boolean,
      allowFindByPhone: Boolean,    // Default: true
      profileVisibility: "everyone" | "friends" | "nobody",
      readReceipts: Boolean,        // Default: true
    },
    notification: {
      messageSound: String,
      messageVibrate: Boolean,
      callSound: String,
      showPreview: Boolean,
      showNotification: Boolean,
      muteUntil: Date,
    },
    chat: {
      fontSize: Number,            // 12-24, default: 16
      wallpaper: String,
      enterToSend: Boolean,
      mediaAutoDownload: { wifi: Boolean, mobile: Boolean },
    },
    backup: {
      enabled: Boolean,
      frequency: "daily" | "weekly" | "monthly" | "manual",
      includeMedia: Boolean,
      lastBackupAt: Date,
      lastBackupSize: Number,
    },
  },

  // Social
  friends: [ObjectId → User],
  blockedUsers: [ObjectId → User],
  friendCount: Number,

  // Auth & Device
  fcmTokens: [{ token, deviceId, platform, lastUsed }],
  refreshTokens: [{ token (hashed), deviceId, expiresAt }],

  // Encryption
  publicKey: String,
  keyBundleId: ObjectId → KeyBundle,

  // Status
  isOnline: Boolean,
  lastSeen: Date,
  isVerified: Boolean,
  status: "active" | "suspended" | "deleted" | "deactivated",
  deletedAt: Date,

  timestamps: true,            // createdAt, updatedAt
}

// Indexes
{ displayName: 'text' }        // Full-text search
{ isOnline: 1 }
{ friends: 1 }
{ status: 1 }
{ phone: 1 }                   // Auto via unique: true
```

---

### Conversation

Metadata hội thoại (1-1 và nhóm). **Không chứa nội dung tin nhắn.**

```javascript
{
  type: "private" | "group",

  participants: [{
    user: ObjectId → User,
    role: "owner" | "admin" | "co-admin" | "member",
    nickname: String,
    joinedAt: Date,
    addedBy: ObjectId,

    // Per-user settings
    isMuted: Boolean,
    mutedUntil: Date,
    isPinned: Boolean,
    isHidden: Boolean,
    isArchived: Boolean,
    customWallpaper: String,

    // Sync markers
    lastReadMessageId: ObjectId,
    lastReadAt: Date,
    lastDeliveredMessageId: ObjectId,
    unreadCount: Number,

    // Soft delete
    deletedAt: Date,
    clearHistoryAt: Date,
  }],

  // Preview cho conversation list
  lastMessage: {
    _id: ObjectId,
    sender: ObjectId → User,
    type: String,
    preview: String,            // Truncated at 100 chars
    timestamp: Date,
    isRecalled: Boolean,
  },

  // Group-only fields
  group: {
    name: String,
    avatar: { url, publicId },
    description: String,
    inviteLink: String,         // Unique, sparse
    inviteLinkEnabled: Boolean,
    createdBy: ObjectId → User,
    settings: {
      onlyAdminCanSend: Boolean,
      onlyAdminCanAddMember: Boolean,
      onlyAdminCanChangeInfo: Boolean,
      onlyAdminCanPin: Boolean,
      approvalRequired: Boolean,
      maxMembers: Number,
      slowMode: Number,
    },
    pendingRequests: [{ user, requestedAt, message }],
  },

  pinnedMessages: [{ messageId, pinnedBy, pinnedAt, preview }],
  totalMessages: Number,
  totalMedia: Number,
  isActive: Boolean,

  timestamps: true,
}

// Indexes
{ 'participants.user': 1, updatedAt: -1 }    // Conversation list query
{ type: 1 }
{ 'participants.user': 1, 'participants.isPinned': 1 }
{ 'participants.user': 1, 'participants.isArchived': 1 }
```

---

### MessageQueue

Hàng đợi tin nhắn offline. Tự động xóa sau 30 ngày (TTL index).

```javascript
{
  messageId: String,            // Unique
  clientMessageId: String,

  conversation: ObjectId → Conversation,
  sender: ObjectId → User,
  recipient: ObjectId → User,

  type: String,                 // text|image|video|...
  encryptedContent: String,
  content: String,

  attachments: [{ fileName, fileSize, fileType, url, thumbnailUrl, duration, dimensions, encryptionKey }],
  sticker: { packId, stickerId, url },
  location: { latitude, longitude, address, name },
  sharedContact: { name, phone, avatar },
  replyTo: { messageId, senderName, preview, type },
  forwardedFrom: { messageId, conversationId },
  mentions: [{ userId, offset, length }],
  systemEvent: { type, targetUser, metadata },

  status: "queued" | "delivering" | "delivered" | "failed" | "expired",
  attempts: Number,
  maxAttempts: Number,
  deliveredAt: Date,

  expiresAt: Date,             // TTL auto-delete (30 days)
  createdAt: Date,
}

// Indexes
{ recipient: 1, status: 1, createdAt: 1 }   // Fetch queued messages
{ conversation: 1, createdAt: 1 }
{ expiresAt: 1 }               // TTL index (expireAfterSeconds: 0)
```

---

### MessageMetadata

Metadata nhẹ cho mỗi tin nhắn — reactions, delivery tracking.

```javascript
{
  messageId: String,            // Unique
  conversation: ObjectId,
  sender: ObjectId,
  type: String,
  preview: String,              // Max 100 chars
  isRecalled: Boolean,
  recalledAt: Date,

  reactions: [{
    user: ObjectId,
    emoji: String,
    createdAt: Date,
  }],

  deliveredTo: [{ user: ObjectId, deliveredAt: Date }],
  readBy: [{ user: ObjectId, readAt: Date }],
  deletedFor: [ObjectId],

  createdAt: Date,
}

// Indexes
{ conversation: 1, createdAt: -1 }
{ sender: 1, createdAt: -1 }
```

---

### DeviceSession

Quản lý phiên đăng nhập đa thiết bị.

```javascript
{
  user: ObjectId,
  deviceId: String,             // Unique per user
  deviceName: String,
  deviceModel: String,
  platform: "android" | "ios" | "web",
  osVersion: String,
  appVersion: String,
  ipAddress: String,
  location: { city, country },

  isActive: Boolean,
  lastActiveAt: Date,
  socketId: String,
  fcmToken: String,

  loginAt: Date,
  logoutAt: Date,

  timestamps: true,
}

// Indexes
{ user: 1, deviceId: 1 }       // Unique compound
{ user: 1, isActive: 1 }
{ socketId: 1 }
```

---

### FriendRequest

```javascript
{
  from: ObjectId → User,
  to: ObjectId → User,
  message: String,              // Default greeting
  source: "search" | "phone" | "qrcode" | "group" | "suggestion" | "contact_sync",
  status: "pending" | "accepted" | "rejected" | "cancelled" | "blocked",
  respondedAt: Date,
  timestamps: true,
}

// Indexes
{ from: 1, to: 1 }            // Unique compound
{ to: 1, status: 1, createdAt: -1 }
```

---

### Story

Tự động hết hạn sau 24 giờ (TTL index).

```javascript
{
  author: ObjectId → User,
  type: "image" | "video" | "text",

  content: { text, backgroundColor, fontFamily, textColor },
  media: { url, publicId, thumbnailUrl, duration, dimensions },
  caption: String,

  privacy: "public" | "friends" | "close_friends" | "custom" | "only_me",
  allowedUsers: [ObjectId],
  excludedUsers: [ObjectId],

  viewers: [{ user: ObjectId, viewedAt: Date, reaction: String }],
  viewCount: Number,
  replies: [{ user, content, type, createdAt }],

  expiresAt: Date,             // TTL: 24h auto-delete
  isActive: Boolean,
  timestamps: true,
}
```

---

### CallLog

```javascript
{
  callId: String,              // Unique
  conversation: ObjectId,
  caller: ObjectId → User,
  receiver: ObjectId → User,
  type: "voice" | "video",
  status: "ringing" | "answered" | "rejected" | "missed" | "cancelled" | "busy" | "failed" | "no_answer",

  startedAt: Date,
  answeredAt: Date,
  endedAt: Date,
  duration: Number,            // Seconds
  endReason: String,

  // Group call
  isGroupCall: Boolean,
  participants: [{ user, joinedAt, leftAt, duration, status }],

  // Quality metrics
  quality: { networkType, codec, avgBitrate, packetLoss, jitter, roundTripTime },

  deletedFor: [ObjectId],
  timestamps: true,
}
```

---

### CloudBackup

```javascript
{
  user: ObjectId → User,
  backupId: String,            // Unique
  type: "full" | "incremental",
  status: "in_progress" | "completed" | "failed" | "expired",

  encryptedFileUrl: String,
  encryptionSalt: String,
  encryptionIv: String,
  fileSize: Number,
  checksum: String,            // SHA-256

  includesMedia: Boolean,
  conversationCount: Number,
  messageCount: Number,

  basedOnBackup: ObjectId,     // For incremental
  fromTimestamp: Date,
  toTimestamp: Date,
  deviceName: String,
  appVersion: String,

  timestamps: true,
}
```

---

### KeyBundle (E2E Encryption)

```javascript
{
  user: ObjectId → User,
  deviceId: String,            // Unique per user

  identityPublicKey: String,   // Long-term identity key
  signedPreKey: {
    keyId: Number,
    publicKey: String,
    signature: String,
    createdAt: Date,
  },
  oneTimePreKeys: [{           // Consumed per session
    keyId: Number,
    publicKey: String,
    isUsed: Boolean,
    usedBy: ObjectId,
    usedAt: Date,
  }],

  isActive: Boolean,
  timestamps: true,
}

// Indexes
{ user: 1, deviceId: 1 }      // Unique compound
{ 'oneTimePreKeys.isUsed': 1 }
```

---

### Notification

```javascript
{
  recipient: ObjectId → User,
  sender: ObjectId → User,
  type: String,                // friend_request, new_message, missed_call, ...
  title: String,
  body: String,
  imageUrl: String,
  data: { conversationId, messageId, storyId, callId, userId, actionUrl },

  isRead: Boolean,
  readAt: Date,
  fcmSent: Boolean,
  fcmError: String,

  groupKey: String,
  count: Number,
  timestamps: true,
}
```

---

## 🔴 Redis Data Structures

| Key Pattern | Type | TTL | Mô tả |
|-------------|------|-----|--------|
| `user:{id}:online` | String | 60s | Trạng thái online |
| `user:{id}:lastSeen` | String | ∞ | Timestamp lần cuối online |
| `user:{id}:sockets` | Set | ∞ | Danh sách socket IDs |
| `user:{id}:appForeground` | String | 30s | App đang foreground |
| `user:{id}:typing:{convId}` | String | 5s | Đang gõ |
| `user:{id}:customStatus` | String (JSON) | 24h | Trạng thái tùy chỉnh |
| `user:{id}:activeCall` | String | 120s | Call ID đang active |
| `socket:{socketId}:user` | String | ∞ | Map socket → user |
| `queue:{userId}` | Sorted Set | ∞ | Offline message queue |
| `dedup:{convId}` | Set | 24h | Client message IDs (chống trùng) |
| `call:{callId}` | Hash | 120s | Call state |
| `otp:{phone}` | Hash | 300s | OTP code + attempts |

---

## 📊 Relationship Diagram

```
                     ┌─────────────┐
                     │    User     │
                     │             │
                     │ phone       │
                     │ password    │
                     │ displayName │
                     │ settings    │
                     │ friends[]   │
                     └──────┬──────┘
                            │
          ┌─────────────────┼────────────────────────┐
          │                 │                         │
          ▼                 ▼                         ▼
  ┌───────────────┐  ┌────────────┐         ┌──────────────┐
  │ DeviceSession │  │FriendRequest│         │  KeyBundle   │
  │               │  │            │         │              │
  │ deviceId      │  │ from → User│         │ identityKey  │
  │ platform      │  │ to → User  │         │ signedPreKey │
  │ socketId      │  │ status     │         │ otpPreKeys[] │
  └───────────────┘  └────────────┘         └──────────────┘
          │
          │ (user is participant)
          ▼
  ┌───────────────────────┐          ┌─────────────────┐
  │    Conversation       │─────────▶│ MessageMetadata  │
  │                       │   1:N    │                  │
  │ type: private|group   │          │ messageId        │
  │ participants[]        │          │ reactions[]       │
  │ lastMessage           │          │ deliveredTo[]    │
  │ group: { name, ... }  │          │ readBy[]         │
  │ pinnedMessages[]      │          └─────────────────┘
  └───────────┬───────────┘
              │ 1:N (temporary)
              ▼
  ┌───────────────────────┐
  │    MessageQueue       │
  │                       │
  │ recipient → User      │
  │ content (temporary)   │
  │ status: queued|...    │
  │ expiresAt (TTL 30d)   │
  └───────────────────────┘

  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐
  │  Story   │  │ CallLog  │  │ CloudBackup  │  │Notification│
  │          │  │          │  │              │  │            │
  │ 24h TTL  │  │ caller   │  │ encrypted    │  │ FCM push   │
  │ viewers[]│  │ receiver │  │ fileUrl      │  │ isRead     │
  │ privacy  │  │ duration │  │ checksum     │  │ type       │
  └──────────┘  └──────────┘  └──────────────┘  └────────────┘
```
