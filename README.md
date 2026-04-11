<p align="center">
  <h1 align="center">🔮 ALOHI — Chat API v2.0</h1>
  <p align="center">
    <strong>High-Performance, Local-First Chat Backend</strong><br/>
    Kiến trúc lấy cảm hứng từ Zalo — Xây dựng bằng Node.js, Socket.IO, MongoDB & Redis
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express" alt="Express"/>
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socketdotio" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis" alt="Redis"/>
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License"/>
</p>

---

## 📑 Mục Lục

- [Tổng Quan](#-tổng-quan)
- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Cơ Chế Hoạt Động](#-cơ-chế-hoạt-động)
- [Tech Stack](#-tech-stack)
- [Cài Đặt & Chạy](#-cài-đặt--chạy)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [API Documentation](#-api-documentation)
- [Socket.IO Events](#-socketio-events)
- [Database Schema](#-database-schema)
- [Bảo Mật](#-bảo-mật)
- [Deployment](#-deployment)

---

## 🎯 Tổng Quan

**Alohi** là một ứng dụng nhắn tin thời gian thực với kiến trúc **Local-First** (ưu tiên lưu trữ cục bộ), lấy cảm hứng từ Zalo. Server đóng vai trò là **message relay** (trạm trung chuyển tin nhắn), không lưu nội dung tin nhắn lâu dài — tất cả nội dung được lưu trên thiết bị người dùng.

### Tính năng chính

| Module | Mô tả |
|--------|-------|
| 🔐 **Authentication** | Đăng ký/đăng nhập SĐT + OTP, JWT Access/Refresh Token Rotation |
| 💬 **Real-time Chat** | Nhắn tin 1-1 & nhóm, gửi ảnh/video/file/sticker/location/contact |
| 📱 **Multi-device** | Đăng nhập nhiều thiết bị, quản lý session từ xa |
| 👥 **Social Graph** | Kết bạn, gợi ý bạn bè, đồng bộ danh bạ, chặn người dùng |
| 📞 **Voice/Video Call** | WebRTC signaling qua Socket.IO |
| 📸 **Stories** | Story 24h tự hết hạn, privacy controls |
| 🔔 **Push Notifications** | FCM (Firebase Cloud Messaging) |
| 🔒 **E2E Encryption** | Signal Protocol key exchange |
| ☁️ **Cloud Backup** | Backup mã hóa AES-256-GCM |
| 😎 **Sticker Store** | Quản lý bộ sticker |

---

## 🏗 Kiến Trúc Hệ Thống

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT APPS                           │
│              (Android / iOS / Web)                           │
├───────────────────────┬──────────────────────────────────────┤
│    REST API (HTTPS)   │      Socket.IO (WSS)                │
│    - Auth / Profile   │      - Realtime Messaging           │
│    - CRUD Operations  │      - Presence & Typing            │
│    - Media Upload     │      - WebRTC Signaling             │
│    - Backup/Restore   │      - Sync Events                  │
├───────────────────────┴──────────────────────────────────────┤
│                                                              │
│                   🚀 ALOHI API SERVER                        │
│                   (Node.js + Express)                        │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │ Middlewares  │  │  Controllers │  │ Socket Handlers  │    │
│  │ - JWT Auth   │  │  - Auth      │  │ - Chat           │    │
│  │ - Validate   │  │  - User      │  │ - Presence       │    │
│  │ - Rate Limit │  │  - Message   │  │ - Call           │    │
│  │ - Upload     │  │  - Group     │  │                  │    │
│  │ - Error      │  │  - Story     │  │                  │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
│          │                │                  │               │
│          └────────────────┼──────────────────┘               │
│                           ▼                                  │
│                   ┌──────────────┐                           │
│                   │   Services   │                           │
│                   │ (Business    │                           │
│                   │  Logic)      │                           │
│                   └──────┬───────┘                           │
│                          │                                   │
├──────────────────────────┼───────────────────────────────────┤
│                          ▼                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │   MongoDB 7.x   │  │   Redis 7.x     │  │ Cloudinary │  │
│  │                  │  │                  │  │            │  │
│  │ - User profiles  │  │ - Online/Offline │  │ - Avatar   │  │
│  │ - Conversations  │  │ - Message Queue  │  │ - Media    │  │
│  │ - Message meta   │  │ - Typing state   │  │ - Stories  │  │
│  │ - Friend graph   │  │ - Call state     │  │ - Files    │  │
│  │ - Stories        │  │ - OTP storage    │  │            │  │
│  │ - Call logs      │  │ - Rate limiting  │  │            │  │
│  │ - Backup records │  │ - Deduplication  │  │            │  │
│  └─────────────────┘  └─────────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚙ Cơ Chế Hoạt Động

### 1. 📨 Message Delivery Pipeline (Cơ chế gửi/nhận tin nhắn)

Alohi sử dụng cơ chế **3-tick delivery** giống Zalo/WhatsApp:

```
Sender                    Server                    Receiver
  │                         │                          │
  │── message:send ────────▶│                          │
  │                         │─── [Process & Store      │
  │                         │     Metadata in MongoDB] │
  │◀── message:sent (✓) ───│                          │
  │                         │                          │
  │                         │── message:receive ──────▶│  (Online)
  │                         │                          │
  │                         │◀── message:ack ─────────│
  │◀── message:delivered    │                          │
  │    (✓✓) ───────────────│                          │
  │                         │                          │
  │                         │◀── message:read ────────│
  │◀── message:read_receipt │                          │
  │    (✓✓ xanh) ──────────│                          │
```

**Khi người nhận OFFLINE:**

```
Sender                    Server                    Receiver
  │                         │                          │
  │── message:send ────────▶│                          │ (Offline)
  │◀── message:sent (✓) ───│                          │
  │                         │─── Queue to Redis ──┐   │
  │                         │    (Sorted Set)     │   │
  │                         │─── Queue to MongoDB │   │
  │                         │    (Backup)         │   │
  │                         │─── FCM Push ────────┼──▶│ 📱
  │                         │                     │   │
  │                         │     ... thời gian trôi qua ...
  │                         │                     │   │
  │                         │◀── [User connects] ─┘   │
  │                         │── Deliver all ──────────▶│
  │◀── message:delivered ──│◀── message:ack ─────────│
```

### 2. 🟢 Presence System (Hệ thống trạng thái online)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Device 1  │     │   Device 2  │     │   Device 3  │
│  (Android)  │     │   (iOS)     │     │   (Web)     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────┐
│                    Redis                              │
│                                                       │
│  user:{id}:online    = "true"   (TTL: 60s)           │
│  user:{id}:sockets   = {sock1, sock2, sock3}         │
│  user:{id}:lastSeen  = timestamp                     │
│  user:{id}:typing:{convId} = "true" (TTL: 5s)       │
│  user:{id}:appForeground = "true" (TTL: 30s)        │
│                                                       │
│  → Heartbeat mỗi 30s refresh TTL                     │
│  → Nếu tất cả socket disconnect → user OFFLINE       │
│  → lastSeen được cập nhật khi offline                 │
└──────────────────────────────────────────────────────┘
```

**Multi-device logic:**
- Mỗi device tạo 1 socket connection
- Tất cả socket IDs lưu trong Redis Set
- User chỉ **offline** khi socket cuối cùng disconnect
- Heartbeat mỗi 30s để refresh TTL

### 3. 📞 WebRTC Call Flow (Luồng gọi điện)

```
Caller                    Server (Redis)             Receiver
  │                         │                          │
  │── call:initiate ───────▶│── [Check busy] ─────────▶│
  │                         │── [Store call state] ────│
  │                         │── call:incoming ────────▶│ 🔔
  │                         │                          │
  │                         │   [30s timeout timer]    │
  │                         │                          │
  │                         │◀── call:accept ─────────│
  │◀── call:accepted ──────│                          │
  │                         │                          │
  │── call:ice-candidate ──▶│── call:ice-candidate ──▶│  ← ICE Exchange
  │◀── call:ice-candidate ──│◀── call:ice-candidate ──│  ← (P2P Setup)
  │                         │                          │
  │═══════════════ WebRTC P2P Connection ══════════════│
  │                         │                          │
  │── call:toggle-audio ───▶│── call:media-state ────▶│
  │── call:toggle-video ───▶│── call:media-state ────▶│
  │                         │                          │
  │── call:end ────────────▶│── call:ended ──────────▶│
  │                         │── [Save CallLog] ────────│
  │                         │── [Cleanup Redis] ───────│
```

### 4. 🔐 E2E Encryption (Mã hóa đầu cuối)

Sử dụng mô hình **Signal Protocol** (X3DH Key Exchange):

```
┌─────────────────────────────────┐
│         KEY BUNDLE              │
│                                  │
│  Identity Key (long-term)        │  ← Định danh lâu dài
│  Signed Pre-Key (rotated)        │  ← Xoay định kỳ
│  One-Time Pre-Keys (consumed)    │  ← Dùng 1 lần / session
└─────────────────────────────────┘

Alice muốn nhắn tin cho Bob:
1. Alice fetch Bob's key bundle (Server trả về + consume 1 OTP key)
2. Alice tạo session key từ X3DH
3. Alice mã hóa tin nhắn bằng AES-256-GCM
4. Server relay encrypted content (không đọc được)
5. Bob giải mã bằng private key của mình
```

### 5. ☁️ Cloud Backup Flow

```
Client                        Server                   Cloudinary
  │                              │                          │
  │── [Encrypt local data       │                          │
  │    with user password        │                          │
  │    using AES-256-GCM]       │                          │
  │                              │                          │
  │── POST /backup/create ─────▶│── [Upload encrypted] ──▶│
  │                              │◀── [file URL] ──────────│
  │                              │── [Save backup record]  │
  │◀── { backupId, checksum } ──│                          │
  │                              │                          │
  │  ─── Restore Flow ───       │                          │
  │                              │                          │
  │── POST /backup/restore ────▶│── [Fetch record] ───────│
  │◀── { fileUrl, salt, iv } ───│                          │
  │── [Download & Decrypt] ─────│                          │
```

### 6. 🔄 Deduplication (Chống trùng tin nhắn)

```
Client gửi message kèm clientMessageId (UUID)

Server:
1. Check Redis Set: dedup:{conversationId}
2. Nếu clientMessageId ĐÃ TỒN TẠI → Trả về "duplicate"
3. Nếu CHƯA → Thêm vào Set (TTL 24h) → Xử lý bình thường
```

---

## 🛠 Tech Stack

| Layer | Technology | Vai trò |
|-------|-----------|---------|
| **Runtime** | Node.js 22.x | JavaScript runtime |
| **Framework** | Express 5.x | HTTP REST API |
| **Realtime** | Socket.IO 4.x | WebSocket cho chat/presence/call |
| **Database** | MongoDB 7.x (Mongoose 9.x) | Persistent storage |
| **Cache** | Redis 7.x (ioredis) | Presence, queue, OTP, rate limit |
| **Auth** | JWT (jsonwebtoken) | Access/Refresh token |
| **Password** | bcryptjs | Password hashing (12 rounds) |
| **Validation** | Joi | Request validation |
| **Upload** | Multer + Cloudinary | File upload & CDN |
| **Push** | Firebase Admin SDK | FCM push notifications |
| **Encryption** | node-forge + crypto | AES-256-GCM, RSA, PBKDF2 |
| **Security** | Helmet, CORS, HPP, mongo-sanitize | HTTP security headers |
| **Logging** | Winston | Structured logging with file rotation |
| **Docs** | Swagger (OpenAPI 3.0) | Auto-generated API docs |
| **Process** | PM2 | Production process manager |
| **Container** | Docker + Docker Compose | Container deployment |

---

## 🚀 Cài Đặt & Chạy

### Yêu cầu

- Node.js >= 20.x
- MongoDB >= 7.x
- Redis >= 7.x (optional cho development)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/alohi-api.git
cd alohi-api
npm install
```

### 2. Cấu hình Environment

```bash
cp .env.example .env
# Chỉnh sửa .env theo môi trường của bạn
```

### 3. Chạy Development

```bash
# Chạy server (auto-reload khi save code)
npm run dev

# Server sẽ chạy tại:
# API:       http://localhost:3000/api
# Docs:      http://localhost:3000/api-docs
# Health:    http://localhost:3000/health
```

### 4. Chạy với Docker

```bash
# Khởi động MongoDB + Redis + App
npm run docker:up

# Dừng
npm run docker:down
```

### 5. Production (PM2)

```bash
npm run pm2:start     # Start cluster mode
npm run pm2:stop      # Stop
npm run pm2:restart   # Restart
```

---

## 📁 Cấu Trúc Thư Mục

```
alohi-api/
├── server.js                  # Entry point: init DB, Redis, Socket.IO, start HTTP
├── ecosystem.config.js        # PM2 cluster configuration
├── docker-compose.yml         # Docker services (App + MongoDB + Redis)
├── Dockerfile                 # Production container build
├── .env.example               # Environment variables template
├── package.json
│
├── docs/                      # 📖 Tài liệu chi tiết
│   ├── API.md                 # REST API documentation
│   ├── SOCKET_EVENTS.md       # Socket.IO events reference
│   └── DATABASE.md            # Database schema documentation
│
├── uploads/                   # Temp upload directory (auto-created)
├── logs/                      # Winston log files (auto-created)
│
└── src/
    ├── app.js                 # Express app (middleware stack)
    │
    ├── config/                # ⚙️ Infrastructure configuration
    │   ├── constants.js       # Enums, Redis keys, upload limits
    │   ├── database.js        # MongoDB connection + reconnect
    │   ├── redis.js           # ioredis connection + retry
    │   ├── cloudinary.js      # Media CDN config
    │   ├── firebase.js        # FCM push config
    │   └── swagger.js         # OpenAPI spec
    │
    ├── models/                # 📦 Mongoose schemas (11 models)
    │   ├── User.js            # User profile + settings + auth
    │   ├── DeviceSession.js   # Multi-device login sessions
    │   ├── Conversation.js    # Chat metadata (1-1 & group)
    │   ├── MessageQueue.js    # Offline message queue (TTL 30d)
    │   ├── MessageMetadata.js # Reactions, delivery/read tracking
    │   ├── FriendRequest.js   # Friend request lifecycle
    │   ├── Story.js           # Stories (TTL 24h auto-expire)
    │   ├── CallLog.js         # Voice/video call history
    │   ├── CloudBackup.js     # Encrypted backup records
    │   ├── KeyBundle.js       # E2E encryption key bundles
    │   ├── Notification.js    # Push notification records
    │   ├── StickerPack.js     # Sticker packs + stickers
    │   └── Report.js          # Abuse reports
    │
    ├── middlewares/            # 🛡️ Request processing pipeline
    │   ├── auth.middleware.js         # JWT verify (required/optional)
    │   ├── socketAuth.middleware.js   # Socket.IO JWT handshake
    │   ├── validate.middleware.js     # Joi schema validation factory
    │   ├── upload.middleware.js       # Multer file handlers
    │   ├── rateLimit.middleware.js    # Rate limiters per endpoint type
    │   └── error.middleware.js        # Global error handler + 404
    │
    ├── validations/            # ✅ Joi validation schemas
    │   ├── auth.validation.js
    │   ├── user.validation.js
    │   ├── message.validation.js
    │   ├── group.validation.js
    │   └── story.validation.js
    │
    ├── services/               # 🧠 Business logic layer
    │   ├── auth.service.js        # Register, login, JWT rotation
    │   ├── user.service.js        # Profile CRUD, privacy-aware view
    │   ├── friend.service.js      # Request lifecycle, suggestions
    │   ├── message.service.js     # Message pipeline + dedup
    │   ├── presence.service.js    # Online/offline via Redis
    │   ├── notification.service.js# FCM push + smart mute
    │   ├── upload.service.js      # Cloudinary + thumbnails
    │   ├── otp.service.js         # OTP generate/verify via Redis
    │   ├── encryption.service.js  # Key bundle management
    │   └── backup.service.js      # Cloud backup CRUD
    │
    ├── controllers/            # 🎮 Request handlers
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── friend.controller.js
    │   ├── conversation.controller.js
    │   ├── message.controller.js
    │   ├── group.controller.js
    │   ├── story.controller.js
    │   ├── call.controller.js
    │   ├── backup.controller.js
    │   ├── notification.controller.js
    │   ├── sticker.controller.js
    │   └── device.controller.js
    │
    ├── routes/                 # 🛤️ API route definitions
    │   ├── index.js            # Route aggregator
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── friend.routes.js
    │   ├── conversation.routes.js
    │   ├── message.routes.js
    │   ├── group.routes.js
    │   ├── story.routes.js
    │   ├── call.routes.js
    │   ├── backup.routes.js
    │   ├── notification.routes.js
    │   ├── sticker.routes.js
    │   ├── device.routes.js
    │   └── upload.routes.js
    │
    ├── socket/                 # 🔌 Socket.IO event system
    │   ├── index.js            # Init, auth, rooms, queue delivery
    │   ├── chat.handler.js     # Message send/ack/deliver/read/recall
    │   ├── presence.handler.js # Typing, status, presence queries
    │   └── call.handler.js     # WebRTC signaling lifecycle
    │
    └── utils/                  # 🔧 Utility modules
        ├── logger.js           # Winston logger
        ├── ApiError.js         # Standardized error class
        ├── ApiResponse.js      # Standardized response wrapper
        ├── asyncHandler.js     # Async middleware wrapper
        ├── pagination.js       # Cursor & offset pagination
        ├── helpers.js          # ID generation, phone sanitize
        └── crypto.js           # AES, RSA, PBKDF2 utilities
```

---

## 📖 API Documentation

> Xem chi tiết tại [docs/API.md](docs/API.md) hoặc truy cập Swagger UI tại `http://localhost:3000/api-docs`

### Quick Reference

| Module | Method | Endpoint | Mô tả |
|--------|--------|----------|--------|
| **Auth** | POST | `/api/auth/send-otp` | Gửi mã OTP |
| | POST | `/api/auth/verify-otp` | Xác minh OTP |
| | POST | `/api/auth/register` | Đăng ký tài khoản |
| | POST | `/api/auth/login` | Đăng nhập |
| | POST | `/api/auth/refresh-token` | Làm mới token |
| | POST | `/api/auth/logout` | Đăng xuất |
| | POST | `/api/auth/logout-all` | Đăng xuất tất cả |
| | PUT | `/api/auth/change-password` | Đổi mật khẩu |
| **User** | GET | `/api/users/me` | Lấy profile của mình |
| | PUT | `/api/users/me` | Cập nhật profile |
| | PUT | `/api/users/me/avatar` | Upload avatar |
| | GET | `/api/users/search?q=` | Tìm kiếm user |
| | GET | `/api/users/:id` | Xem profile user |
| | POST | `/api/users/block/:userId` | Chặn user |
| **Friends** | GET | `/api/friends` | Danh sách bạn bè |
| | POST | `/api/friends/request/:userId` | Gửi lời mời kết bạn |
| | PUT | `/api/friends/request/:id/accept` | Chấp nhận |
| | PUT | `/api/friends/request/:id/reject` | Từ chối |
| | GET | `/api/friends/suggestions` | Gợi ý bạn bè |
| | POST | `/api/friends/sync-contacts` | Đồng bộ danh bạ |
| **Chat** | GET | `/api/conversations` | Danh sách hội thoại |
| | POST | `/api/conversations` | Tạo hội thoại 1-1 |
| | POST | `/api/messages/:convId` | Gửi tin nhắn (REST) |
| | PUT | `/api/messages/:msgId/recall` | Thu hồi tin nhắn |
| | POST | `/api/messages/:msgId/react` | React tin nhắn |
| **Groups** | POST | `/api/groups` | Tạo nhóm |
| | POST | `/api/groups/:id/members` | Thêm thành viên |
| | POST | `/api/groups/join/:link` | Tham gia qua link |
| **Stories** | GET | `/api/stories/feed` | Story feed |
| | POST | `/api/stories` | Đăng story |
| **Upload** | POST | `/api/upload/image` | Upload ảnh |
| | POST | `/api/upload/video` | Upload video |
| | POST | `/api/upload/file` | Upload file |

---

## 🔌 Socket.IO Events

> Xem chi tiết tại [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md)

### Connection

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'Bearer <access_token>',
    deviceId: 'device-uuid',
    platform: 'android', // android | ios | web
    appVersion: '2.0.0',
  },
});
```

### Quick Reference

| Direction | Event | Mô tả |
|-----------|-------|--------|
| **Chat** | | |
| → Server | `message:send` | Gửi tin nhắn |
| ← Client | `message:sent` | ACK: đã gửi (✓) |
| ← Client | `message:receive` | Nhận tin nhắn mới |
| → Server | `message:ack` | ACK: đã nhận |
| ← Client | `message:delivered` | Đã gửi tới (✓✓) |
| → Server | `message:read` | Đánh dấu đã đọc |
| ← Client | `message:read_receipt` | Read receipt (✓✓ xanh) |
| → Server | `message:recall` | Thu hồi tin nhắn |
| → Server | `message:react` | React emoji |
| **Presence** | | |
| → Server | `typing:start` | Bắt đầu gõ |
| → Server | `typing:stop` | Ngừng gõ |
| ← Client | `typing:update` | Cập nhật typing |
| → Server | `heartbeat` | Heartbeat (30s) |
| ← Client | `friend:online` | Bạn bè online |
| ← Client | `friend:offline` | Bạn bè offline |
| **Call** | | |
| → Server | `call:initiate` | Khởi tạo cuộc gọi |
| ← Client | `call:incoming` | Cuộc gọi đến |
| → Server | `call:accept` | Chấp nhận |
| → Server | `call:reject` | Từ chối |
| → Server | `call:end` | Kết thúc |
| ↔ | `call:ice-candidate` | ICE candidate exchange |

---

## 🗃 Database Schema

> Xem chi tiết tại [docs/DATABASE.md](docs/DATABASE.md)

### Quan hệ giữa các model

```
User ──┬── DeviceSession (1:N)
       ├── FriendRequest (M:N via from/to)
       ├── Conversation.participants (M:N)
       ├── Story (1:N)
       ├── CallLog (1:N as caller/receiver)
       ├── CloudBackup (1:N)
       ├── KeyBundle (1:N per device)
       └── Notification (1:N)

Conversation ──── MessageMetadata (1:N)
              └── MessageQueue (1:N, temporary)
```

---

## 🔒 Bảo Mật

### Multi-Layer Security

| Layer | Giải pháp | Mô tả |
|-------|-----------|--------|
| **Transport** | HTTPS / WSS | Mã hóa kênh truyền |
| **Auth** | JWT Access/Refresh | Token rotation, hashed storage |
| **Password** | bcryptjs (12 rounds) | Password hashing |
| **HTTP** | Helmet | Security headers (CSP, HSTS, etc.) |
| **CORS** | Configurable origins | Cross-origin protection |
| **Input** | Joi + mongo-sanitize | Validation + NoSQL injection prevention |
| **Rate Limit** | Per-endpoint limits | DDoS/brute-force protection |
| **E2E** | Signal Protocol | End-to-end encryption |
| **Backup** | AES-256-GCM | Encrypted cloud backups |

### Rate Limiting

| Endpoint | Window | Max Requests |
|----------|--------|-------------|
| OTP | 5 phút | 3 |
| Login | 15 phút | 5 |
| Register | 1 giờ | 3 |
| Messages | 1 phút | 60 |
| Upload | 5 phút | 20 |
| Search | 1 phút | 30 |
| General API | 1 phút | 100 |

---

## 🐳 Deployment

### Docker Compose (Recommended)

```bash
docker-compose up -d
```

Services:
- **app**: Node.js API server (port 3000)
- **mongodb**: MongoDB 7.x (port 27017)
- **redis**: Redis 7.x Alpine (port 6379)

### PM2 Cluster

```bash
# Start in cluster mode (sử dụng tất cả CPU cores)
pm2 start ecosystem.config.js --env production
```

### Environment Variables

| Variable | Default | Mô tả |
|----------|---------|--------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment |
| `MONGODB_URI` | mongodb://localhost:27017/alohi | MongoDB connection |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `JWT_ACCESS_SECRET` | *(required)* | JWT access token secret |
| `JWT_REFRESH_SECRET` | *(required)* | JWT refresh token secret |
| `JWT_ACCESS_EXPIRES_IN` | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | 30d | Refresh token TTL |
| `CLOUDINARY_CLOUD_NAME` | *(optional)* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | *(optional)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | *(optional)* | Cloudinary API secret |

---

## 📊 API Response Format

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thành công",
  "data": { ... },
  "timestamp": "2026-04-11T08:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu không hợp lệ",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "phone", "message": "Số điện thoại không hợp lệ" }
    ]
  },
  "timestamp": "2026-04-11T08:00:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "nextCursor": "2026-04-11T08:00:00.000Z"
  }
}
```

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <strong>Alohi Team</strong>
</p>
