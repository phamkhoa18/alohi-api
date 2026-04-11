# 📖 ALOHI API Documentation

> Base URL: `http://localhost:3000/api`
> 
> Authentication: Bearer Token trong header `Authorization: Bearer <access_token>`

---

## 🔐 Authentication (`/api/auth`)

### POST `/auth/send-otp`

Gửi mã OTP đến số điện thoại.

**Rate Limit:** 3 requests / 5 phút

```json
// Request Body
{
  "phone": "+84912345678"
}

// Response 200
{
  "success": true,
  "message": "OTP đã được gửi",
  "data": {
    "message": "OTP đã được gửi",
    "expiresIn": 300
  }
}
```

> ⚠️ Trong môi trường development, OTP sẽ được log ra console thay vì gửi SMS.

---

### POST `/auth/verify-otp`

Xác minh mã OTP.

```json
// Request Body
{
  "phone": "+84912345678",
  "code": "123456"
}

// Response 200
{
  "success": true,
  "message": "OTP hợp lệ"
}
```

**Lỗi thường gặp:**
- `400` OTP đã hết hạn hoặc không tồn tại
- `400` Mã OTP không đúng
- `429` Quá nhiều lần thử (max 5 lần)

---

### POST `/auth/register`

Đăng ký tài khoản mới.

**Rate Limit:** 3 requests / 1 giờ

```json
// Request Body
{
  "phone": "+84912345678",
  "password": "myPassword123",
  "displayName": "Nguyễn Văn A",
  "gender": "male",           // optional: male | female | other
  "dateOfBirth": "2000-01-15" // optional
}

// Response 201
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "userId": "661f..."
  }
}
```

---

### POST `/auth/login`

Đăng nhập và nhận token.

**Rate Limit:** 5 requests / 15 phút

```json
// Request Body
{
  "phone": "+84912345678",
  "password": "myPassword123",
  "deviceId": "device-uuid-xxx",         // Required
  "deviceName": "Samsung Galaxy S24",     // Optional
  "deviceModel": "SM-S921B",             // Optional
  "platform": "android",                 // Required: android | ios | web
  "osVersion": "14.0",                   // Optional
  "appVersion": "2.0.0",                 // Optional
  "fcmToken": "firebase-token-xxx"       // Optional
}

// Response 200
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "_id": "661f...",
      "phone": "+84912345678",
      "displayName": "Nguyễn Văn A",
      "avatar": { "url": null },
      "settings": { ... },
      "friendCount": 0,
      "isOnline": true
    },
    "accessToken": "eyJhbGc...",          // Expires in 15m
    "refreshToken": "eyJhbGc..."          // Expires in 30d
  }
}
```

---

### POST `/auth/refresh-token`

Làm mới access token bằng refresh token. Sử dụng **Token Rotation** — mỗi lần refresh sẽ tạo cặp token mới.

```json
// Request Body
{
  "refreshToken": "eyJhbGc..."
}

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

### POST `/auth/logout` 🔒

Đăng xuất thiết bị hiện tại.

### POST `/auth/logout-all` 🔒

Đăng xuất tất cả thiết bị.

### PUT `/auth/change-password` 🔒

```json
{
  "currentPassword": "oldPass",
  "newPassword": "newPass123"
}
```

### POST `/auth/forgot-password`

```json
{ "phone": "+84912345678" }
```

### POST `/auth/reset-password`

```json
{
  "phone": "+84912345678",
  "otpCode": "123456",
  "newPassword": "newPass123"
}
```

### DELETE `/auth/delete-account` 🔒

Soft delete tài khoản.

---

## 👤 Users (`/api/users`)

### GET `/users/me` 🔒

Lấy profile đầy đủ của mình (bao gồm settings).

### PUT `/users/me` 🔒

Cập nhật profile.

```json
{
  "displayName": "Tên mới",
  "bio": "Hello world!",
  "gender": "male",
  "dateOfBirth": "2000-01-15",
  "customStatusText": "Đang bận",
  "customStatusEmoji": "💼"
}
```

### PUT `/users/me/avatar` 🔒

Upload avatar. **Content-Type: multipart/form-data**

| Field | Type | Max Size |
|-------|------|----------|
| `avatar` | image/jpeg, png, webp, gif | 5 MB |

Response trả về profile đã cập nhật với `avatar.url` và `avatar.thumbnailUrl`.

### DELETE `/users/me/avatar` 🔒

Xóa avatar.

### PUT `/users/me/cover` 🔒

Upload ảnh bìa. Field: `coverPhoto`, max 10MB.

### PUT `/users/me/settings/privacy` 🔒

```json
{
  "showPhone": false,
  "showLastSeen": true,
  "showOnlineStatus": true,
  "allowStrangerMessage": false,
  "allowFindByPhone": true,
  "profileVisibility": "everyone",    // everyone | friends | nobody
  "readReceipts": true
}
```

### PUT `/users/me/settings/notification` 🔒

```json
{
  "messageSound": "default",
  "showPreview": true,
  "showNotification": true,
  "muteUntil": null
}
```

### PUT `/users/me/settings/chat` 🔒

```json
{
  "fontSize": 16,
  "enterToSend": true,
  "mediaAutoDownload": { "wifi": true, "mobile": false }
}
```

### GET `/users/search?q=keyword` 🔒

**Rate Limit:** 30 requests / phút

| Query | Type | Default | Mô tả |
|-------|------|---------|--------|
| `q` | string | required | Tên hoặc SĐT |
| `page` | int | 1 | Trang |
| `limit` | int | 20 | Kết quả / trang (max 50) |

### GET `/users/:id` 🔒

Xem profile user khác. Tự động áp dụng privacy settings.

### GET `/users/phone/:phone` 🔒

Tìm user bằng SĐT (tôn trọng setting `allowFindByPhone`).

### POST `/users/block/:userId` 🔒

Chặn user (tự động hủy kết bạn).

### DELETE `/users/block/:userId` 🔒

Bỏ chặn user.

### GET `/users/blocked` 🔒

Danh sách user đã chặn.

---

## 👥 Friends (`/api/friends`)

### GET `/friends` 🔒

Danh sách bạn bè.

| Query | Default | Mô tả |
|-------|---------|--------|
| `search` | - | Tìm theo tên |
| `page` | 1 | Trang |
| `limit` | 20 | Kết quả / trang |

### GET `/friends/online` 🔒

Danh sách bạn đang online.

### GET `/friends/count` 🔒

Tổng số bạn bè.

### POST `/friends/request/:userId` 🔒

Gửi lời mời kết bạn.

```json
{
  "message": "Xin chào! Mình muốn kết bạn.",    // optional
  "source": "search"    // search | phone | qrcode | group | suggestion | contact_sync
}
```

> 💡 Nếu người kia đã gửi lời mời trước → **tự động chấp nhận** và tạo conversation.

### GET `/friends/requests/received` 🔒

Lời mời kết bạn đã nhận (pending).

### GET `/friends/requests/sent` 🔒

Lời mời đã gửi (pending).

### GET `/friends/requests/count` 🔒

Số lời mời chờ xử lý.

### PUT `/friends/request/:requestId/accept` 🔒

Chấp nhận lời mời → Tự động tạo conversation 1-1.

### PUT `/friends/request/:requestId/reject` 🔒

Từ chối lời mời.

### DELETE `/friends/request/:requestId` 🔒

Hủy lời mời đã gửi.

### DELETE `/friends/:userId` 🔒

Hủy kết bạn.

### GET `/friends/suggestions` 🔒

Gợi ý bạn bè dựa trên thuật toán **Mutual Friends** (bạn chung).

### POST `/friends/sync-contacts` 🔒

Đồng bộ danh bạ — gửi danh sách SĐT, server trả về user tương ứng.

```json
{
  "phoneNumbers": ["+84912345678", "+84987654321", ...]
}
```

### GET `/friends/mutual/:userId` 🔒

Xem bạn chung với user khác.

---

## 💬 Conversations (`/api/conversations`)

### GET `/conversations` 🔒

Danh sách hội thoại (cursor-based pagination).

| Query | Default | Mô tả |
|-------|---------|--------|
| `cursor` | - | ISO timestamp, lấy từ response trước |
| `limit` | 20 | Max 50 |

```json
// Response
{
  "data": [
    {
      "_id": "...",
      "type": "private",
      "participants": [...],
      "lastMessage": {
        "sender": { "displayName": "Văn A" },
        "type": "text",
        "preview": "Hello!",
        "timestamp": "2026-04-11T...",
        "isRecalled": false
      },
      "updatedAt": "2026-04-11T..."
    }
  ],
  "pagination": {
    "nextCursor": "2026-04-10T...",
    "hasMore": true
  }
}
```

### GET `/conversations/pinned` 🔒

Hội thoại đã ghim.

### GET `/conversations/archived` 🔒

Hội thoại đã lưu trữ.

### GET `/conversations/:id` 🔒

Chi tiết hội thoại (bao gồm participants đầy đủ).

### POST `/conversations` 🔒

Tạo/mở hội thoại 1-1.

```json
{ "userId": "target-user-id" }
```

> 💡 Nếu conversation đã tồn tại → trả về conversation cũ (un-hide nếu đã ẩn).

### Actions trên conversation:

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| PUT | `/:id/mute` | Tắt thông báo |
| PUT | `/:id/unmute` | Bật lại thông báo |
| PUT | `/:id/pin` | Ghim |
| PUT | `/:id/unpin` | Bỏ ghim |
| PUT | `/:id/archive` | Lưu trữ |
| PUT | `/:id/unarchive` | Bỏ lưu trữ |
| PUT | `/:id/hide` | Ẩn |
| DELETE | `/:id` | Xóa (cho bản thân) |
| PUT | `/:id/clear-history` | Xóa lịch sử |
| GET | `/:id/members` | Xem thành viên |

---

## ✉️ Messages (`/api/messages`)

> ⚡ Khuyến nghị: Sử dụng **Socket.IO** cho tin nhắn real-time. REST endpoint là **fallback**.

### POST `/messages/:conversationId` 🔒

Gửi tin nhắn (REST fallback).

**Rate Limit:** 60 requests / phút

```json
// Request Body
{
  "clientMessageId": "uuid-from-client",      // Required (dedup)
  "type": "text",                              // text|image|video|audio|file|sticker|gif|location|contact
  "content": "Tin nhắn nội dung",             // For text type
  "encryptedContent": "base64...",            // For E2E encrypted

  // Optional fields depends on type:
  "attachments": [{
    "fileName": "photo.jpg",
    "fileSize": 102400,
    "fileType": "image/jpeg",
    "url": "https://...",
    "thumbnailUrl": "https://..."
  }],

  "replyTo": {                                // Reply tin nhắn
    "messageId": "msg_xxx",
    "senderName": "Văn A",
    "preview": "Hello!",
    "type": "text"
  },

  "mentions": [{                              // Tag người
    "userId": "user-id",
    "offset": 0,
    "length": 5
  }],

  "sticker": {                                // Sticker
    "packId": "pack_01",
    "stickerId": "sticker_01",
    "url": "https://..."
  },

  "location": {                               // Vị trí
    "latitude": 10.762622,
    "longitude": 106.660172,
    "address": "TP.HCM",
    "name": "Landmark 81"
  },

  "sharedContact": {                          // Chia sẻ contact
    "name": "Văn B",
    "phone": "+84987654321"
  }
}

// Response 201
{
  "data": {
    "messageId": "msg_abc123...",
    "conversationId": "...",
    "sender": "...",
    "type": "text",
    "preview": "Tin nhắn nội dung",
    "timestamp": "2026-04-11T..."
  }
}
```

### PUT `/messages/:messageId/recall` 🔒

Thu hồi tin nhắn (trong 24 giờ).

### DELETE `/messages/:messageId` 🔒

Xóa tin nhắn cho bản thân.

### POST `/messages/:messageId/react` 🔒

React emoji.

```json
{ "emoji": "❤️" }
```

### DELETE `/messages/:messageId/react` 🔒

Bỏ react.

### POST `/messages/:messageId/forward` 🔒

Chuyển tiếp tin nhắn.

```json
{
  "targetConversationIds": ["conv1", "conv2"]    // Max 10
}
```

### POST `/messages/:convId/pin/:messageId` 🔒

Ghim tin nhắn trong hội thoại.

### DELETE `/messages/:convId/pin/:messageId` 🔒

Bỏ ghim.

---

## 👥 Groups (`/api/groups`)

### POST `/groups` 🔒

Tạo nhóm mới.

```json
{
  "name": "Nhóm bạn thân",         // Required, max 100 chars
  "members": ["userId1", "userId2"], // Required, min 2
  "description": "Mô tả nhóm"       // Optional
}
```

### PUT `/groups/:id` 🔒

Cập nhật thông tin nhóm (name, description).

### DELETE `/groups/:id` 🔒

Giải tán nhóm (chỉ owner).

### POST `/groups/:id/members` 🔒

Thêm thành viên.

```json
{ "members": ["userId1", "userId2"] }
```

### DELETE `/groups/:id/members/:userId` 🔒

Xóa thành viên (cần quyền admin).

### POST `/groups/:id/leave` 🔒

Rời nhóm (owner phải chuyển quyền trước).

### PUT `/groups/:id/members/:userId/role` 🔒

Thay đổi vai trò thành viên.

```json
{ "role": "admin" }    // admin | co-admin | member
```

### PUT `/groups/:id/transfer-owner/:userId` 🔒

Chuyển quyền chủ nhóm.

### POST `/groups/:id/invite-link` 🔒

Tạo link mời mới.

### POST `/groups/join/:inviteLink` 🔒

Tham gia nhóm qua link mời.

### PUT `/groups/:id/settings` 🔒

Cập nhật cài đặt nhóm.

```json
{
  "onlyAdminCanSend": false,
  "onlyAdminCanAddMember": false,
  "onlyAdminCanChangeInfo": true,
  "approvalRequired": false,
  "maxMembers": 500,
  "slowMode": 0
}
```

---

## 📸 Stories (`/api/stories`)

### GET `/stories/feed` 🔒

Story feed (nhóm theo author, đánh dấu chưa xem).

### GET `/stories/me` 🔒

Story của mình.

### POST `/stories` 🔒

Đăng story. **Content-Type: multipart/form-data**

| Field | Type | Mô tả |
|-------|------|--------|
| `type` | string | `image` \| `video` \| `text` |
| `media` | file | Ảnh/video (max 30MB) |
| `text` | string | Nội dung text story |
| `backgroundColor` | string | Màu nền text story |
| `caption` | string | Caption (max 500) |
| `privacy` | string | `public` \| `friends` \| `close_friends` \| `custom` \| `only_me` |

### DELETE `/stories/:id` 🔒

Xóa story.

### POST `/stories/:id/view` 🔒

Đánh dấu đã xem story.

### GET `/stories/:id/viewers` 🔒

Xem ai đã xem story (chỉ author).

### POST `/stories/:id/react` 🔒

React story.

### POST `/stories/:id/reply` 🔒

Trả lời story.

---

## 📞 Calls (`/api/calls`)

### GET `/calls/history` 🔒

Lịch sử cuộc gọi (paginated).

### GET `/calls/missed` 🔒

Cuộc gọi nhỡ.

### GET `/calls/:callId` 🔒

Chi tiết cuộc gọi.

### DELETE `/calls/:callId` 🔒

Xóa log cuộc gọi.

### DELETE `/calls/history/clear` 🔒

Xóa toàn bộ lịch sử.

---

## ☁️ Backup (`/api/backup`)

### GET `/backup/status` 🔒

Trạng thái backup và settings.

### PUT `/backup/settings` 🔒

```json
{
  "enabled": true,
  "frequency": "weekly",     // daily | weekly | monthly | manual
  "includeMedia": false
}
```

### POST `/backup/create` 🔒

Tạo backup mới.

### GET `/backup/list` 🔒

Danh sách backup.

### POST `/backup/restore/:backupId` 🔒

Lấy thông tin để restore.

### DELETE `/backup/:backupId` 🔒

Xóa backup.

---

## 🔔 Notifications (`/api/notifications`)

### GET `/notifications` 🔒

Danh sách thông báo (paginated).

### GET `/notifications/unread-count` 🔒

Số thông báo chưa đọc.

### PUT `/notifications/:id/read` 🔒

Đánh dấu đã đọc.

### PUT `/notifications/read-all` 🔒

Đánh dấu tất cả đã đọc.

### DELETE `/notifications/:id` 🔒

Xóa thông báo.

### DELETE `/notifications/clear-all` 🔒

Xóa tất cả.

---

## 😎 Stickers (`/api/stickers`)

### GET `/stickers/store` 🔒

Danh sách bộ sticker.

### GET `/stickers/store/:category` 🔒

Sticker theo category: `emoji` | `character` | `cute` | `funny` | `love` | `seasonal` | `custom`

### GET `/stickers/packs/:id` 🔒

Chi tiết bộ sticker (bao gồm tất cả stickers).

### POST `/stickers/packs/:id/download` 🔒

Tải bộ sticker.

### GET `/stickers/search?q=keyword` 🔒

Tìm kiếm sticker.

---

## 📱 Devices (`/api/devices`)

### GET `/devices` 🔒

Danh sách thiết bị đang đăng nhập.

### GET `/devices/current` 🔒

Thiết bị hiện tại.

### PUT `/devices/:deviceId/rename` 🔒

Đổi tên thiết bị.

### DELETE `/devices/:deviceId` 🔒

Đăng xuất thiết bị khác.

### DELETE `/devices/others` 🔒

Đăng xuất tất cả thiết bị khác.

### PUT `/devices/:deviceId/fcm-token` 🔒

Cập nhật FCM token.

---

## 📤 Upload (`/api/upload`)

### POST `/upload/image` 🔒

Upload ảnh chat. **Max 10MB**. Trả về URL + thumbnail.

### POST `/upload/video` 🔒

Upload video. **Max 50MB**. Trả về URL + thumbnail.

### POST `/upload/audio` 🔒

Upload voice message. **Max 10MB**.

### POST `/upload/file` 🔒

Upload file bất kỳ. **Max 100MB**.

### POST `/upload/multiple` 🔒

Upload nhiều file. **Max 10 files**.

### DELETE `/upload/:publicId` 🔒

Xóa file từ CDN.

---

## 📊 Health Check

### GET `/health`

```json
{
  "status": "ok",
  "service": "alohi-api",
  "version": "2.0.0",
  "uptime": 3600,
  "timestamp": "2026-04-11T08:00:00.000Z"
}
```

---

> 🔒 = Yêu cầu header `Authorization: Bearer <access_token>`
