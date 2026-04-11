# 🔌 Socket.IO Events Reference

## Kết Nối

### Authentication

Socket.IO sử dụng JWT để xác thực khi handshake:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken,           // JWT access token
    deviceId: 'device-uuid',      // Unique device identifier
    platform: 'android',          // android | ios | web
    appVersion: '2.0.0',          // App version
  },
  transports: ['websocket'],      // Prefer WebSocket
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});
```

### Connection Events

```javascript
// Kết nối thành công
socket.on('connected', (data) => {
  console.log('Connected!', data);
  // data = {
  //   userId: "661f...",
  //   serverTime: 1712822400000,
  //   onlineFriends: ["userId1", "userId2"],
  //   pendingMessages: 3
  // }
});

// Lỗi xác thực
socket.on('connect_error', (error) => {
  if (error.message === 'Token expired') {
    // Refresh token rồi reconnect
  }
});
```

---

## 💬 Chat Events

### Gửi Tin Nhắn

```javascript
// ━━━ CLIENT → SERVER ━━━
socket.emit('message:send', {
  clientMessageId: 'uuid-v4',        // Client-generated ID (dedup)
  conversationId: '661f...',
  type: 'text',                       // text|image|video|audio|file|sticker|gif|location|contact
  content: 'Xin chào!',              // Nội dung text
  encryptedContent: null,             // Nội dung đã mã hóa E2E (thay thế content)

  // === Tùy chọn ===
  attachments: [{                     // File đính kèm
    fileName: 'photo.jpg',
    fileSize: 102400,
    fileType: 'image/jpeg',
    url: 'https://cloudinary.com/...',
    thumbnailUrl: 'https://cloudinary.com/thumb/...',
    duration: null,                   // Cho audio/video
    dimensions: { width: 1920, height: 1080 },
  }],

  replyTo: {                          // Trả lời tin nhắn
    messageId: 'msg_xxx',
    senderName: 'Văn A',
    preview: 'Tin nhắn gốc...',
    type: 'text',
  },

  mentions: [{                        // Tag người dùng
    userId: '661f...',
    offset: 0,                        // Vị trí trong text
    length: 10,                       // Độ dài @mention
  }],

  sticker: {                          // Sticker
    packId: 'pack_01',
    stickerId: 'sticker_01',
    url: 'https://...',
  },

  location: {                         // Chia sẻ vị trí
    latitude: 10.762622,
    longitude: 106.660172,
    address: '123 Nguyễn Huệ, Q.1, TP.HCM',
    name: 'Landmark 81',
  },

  sharedContact: {                    // Chia sẻ danh bạ
    name: 'Nguyễn Văn B',
    phone: '+84987654321',
    avatar: 'https://...',
  },
});
```

### Nhận Phản Hồi

```javascript
// ━━━ SERVER → CLIENT (sender) ━━━
// ✓ Tin nhắn đã được server xử lý
socket.on('message:sent', (data) => {
  // data = {
  //   clientMessageId: 'uuid-v4',       ← Map lại với tin nhắn local
  //   messageId: 'msg_abc123...',       ← Server-generated ID
  //   timestamp: '2026-04-11T...',
  //   status: 'sent' | 'duplicate'
  // }
  
  // Cập nhật UI: ✓ (đã gửi)
  updateMessageStatus(data.clientMessageId, 'sent');
});

// ━━━ SERVER → CLIENT (receiver) ━━━
// Nhận tin nhắn mới
socket.on('message:receive', (data) => {
  // data = {
  //   messageId: 'msg_abc123...',
  //   conversationId: '661f...',
  //   sender: {
  //     _id: '662f...',
  //     displayName: 'Văn A',
  //     avatar: { url: '...', thumbnailUrl: '...' },
  //   },
  //   type: 'text',
  //   content: 'Xin chào!',
  //   encryptedContent: null,
  //   attachments: [...],
  //   replyTo: null,
  //   mentions: [],
  //   sticker: null,
  //   location: null,
  //   sharedContact: null,
  //   preview: 'Xin chào!',
  //   timestamp: '2026-04-11T...',
  // }

  // Lưu vào local DB
  saveMessage(data);
  
  // Gửi ACK cho server
  socket.emit('message:ack', {
    messageId: data.messageId,
    conversationId: data.conversationId,
  });
});
```

### Delivery & Read Receipts

```javascript
// ✓✓ Tin nhắn đã được gửi tới người nhận
socket.on('message:delivered', (data) => {
  // data = { messageId, conversationId, userId, deliveredAt }
  updateMessageStatus(data.messageId, 'delivered');
});

// Đánh dấu đã đọc (gửi khi user mở conversation)
socket.emit('message:read', {
  conversationId: '661f...',
  messageId: 'msg_last_read',        // ID tin nhắn cuối cùng đã đọc
});

// ✓✓ (xanh) Tin nhắn đã được đọc
socket.on('message:read_receipt', (data) => {
  // data = { conversationId, userId, messageId, readAt }
  updateMessageStatus(data.messageId, 'read');
});
```

### Thu Hồi, React, Forward

```javascript
// Thu hồi tin nhắn (trong 24h)
socket.emit('message:recall', {
  messageId: 'msg_abc123',
  conversationId: '661f...',
});

// Nhận thông báo thu hồi
socket.on('message:recalled', (data) => {
  // data = { messageId, conversationId, recalledBy }
  markMessageRecalled(data.messageId);
});

// React emoji
socket.emit('message:react', {
  messageId: 'msg_abc123',
  conversationId: '661f...',
  emoji: '❤️',
});

// Nhận cập nhật react
socket.on('message:react_update', (data) => {
  // data = { messageId, conversationId, userId, emoji, action: 'add'|'remove' }
});

// Forward tin nhắn
socket.emit('message:forward', {
  messageId: 'msg_abc123',
  targetConversationIds: ['conv_1', 'conv_2'],
});

// Lỗi gửi tin nhắn
socket.on('message:error', (data) => {
  // data = { clientMessageId, error, code: 'SEND_FAILED'|'RECALL_FAILED' }
});
```

---

## 🟢 Presence Events

### Typing Indicator

```javascript
// Bắt đầu gõ
socket.emit('typing:start', { conversationId: '661f...' });

// Ngừng gõ
socket.emit('typing:stop', { conversationId: '661f...' });

// Nhận cập nhật typing từ người khác
socket.on('typing:update', (data) => {
  // data = {
  //   conversationId: '661f...',
  //   userId: '662f...',
  //   displayName: 'Văn A',
  //   isTyping: true,
  // }
  showTypingIndicator(data);
});
```

### Online/Offline Status

```javascript
// Bạn bè online
socket.on('friend:online', (data) => {
  // data = {
  //   userId: '662f...',
  //   customStatus: { text: 'Đang bận', emoji: '💼' },
  // }
});

// Bạn bè offline
socket.on('friend:offline', (data) => {
  // data = { userId: '662f...', lastSeen: '2026-04-11T...' }
});
```

### Heartbeat

Client nên gửi heartbeat mỗi 30 giây để duy trì trạng thái online:

```javascript
setInterval(() => {
  socket.emit('heartbeat');
}, 30000);

socket.on('heartbeat:ack', (data) => {
  // data = { serverTime: 1712822400000 }
  syncClock(data.serverTime);
});
```

### Custom Status

```javascript
// Cập nhật trạng thái
socket.emit('status:update', {
  text: 'Đang bận',
  emoji: '💼',
});

// Nhận cập nhật trạng thái từ bạn bè
socket.on('status:changed', (data) => {
  // data = { userId, text, emoji }
});
```

### Batch Presence Query

```javascript
// Truy vấn trạng thái nhiều user cùng lúc
socket.emit('presence:get', {
  userIds: ['userId1', 'userId2', 'userId3'],
});

socket.on('presence:result', (data) => {
  // data = {
  //   users: [
  //     { id: 'userId1', isOnline: true, lastSeen: null, customStatus: {...} },
  //     { id: 'userId2', isOnline: false, lastSeen: '2026-04-11T...', customStatus: null },
  //   ]
  // }
});
```

---

## 📞 Call Events (WebRTC Signaling)

### Khởi Tạo Cuộc Gọi

```javascript
// Caller gọi
socket.emit('call:initiate', {
  receiverId: '662f...',
  type: 'video',               // voice | video
  sdpOffer: rtcPeerConnection.localDescription,
  callId: 'call_xyz',          // Optional, server sẽ generate nếu không có
});

// Receiver nhận cuộc gọi đến
socket.on('call:incoming', (data) => {
  // data = {
  //   callId: 'call_xyz...',
  //   caller: {
  //     _id: '661f...',
  //     displayName: 'Văn A',
  //     avatar: { url: '...' },
  //   },
  //   type: 'video',
  //   sdpOffer: { ... },
  // }
  showIncomingCallUI(data);
});
```

### Chấp Nhận / Từ Chối

```javascript
// Receiver chấp nhận
socket.emit('call:accept', {
  callId: 'call_xyz',
  sdpAnswer: rtcPeerConnection.localDescription,
});

// Caller nhận ACK chấp nhận
socket.on('call:accepted', (data) => {
  // data = { callId, sdpAnswer }
  rtcPeerConnection.setRemoteDescription(data.sdpAnswer);
});

// Receiver từ chối
socket.emit('call:reject', {
  callId: 'call_xyz',
  reason: 'busy',              // Optional
});

// Caller nhận thông báo bị từ chối
socket.on('call:rejected', (data) => {
  // data = { callId, reason }
});
```

### ICE Candidate Exchange

```javascript
// Gửi ICE candidate
rtcPeerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('call:ice-candidate', {
      callId: 'call_xyz',
      candidate: event.candidate,
    });
  }
};

// Nhận ICE candidate
socket.on('call:ice-candidate', (data) => {
  rtcPeerConnection.addIceCandidate(data.candidate);
});
```

### Media Controls & End

```javascript
// Tắt/bật video
socket.emit('call:toggle-video', { callId: 'call_xyz', enabled: false });

// Tắt/bật audio
socket.emit('call:toggle-audio', { callId: 'call_xyz', enabled: true });

// Nhận cập nhật trạng thái media
socket.on('call:media-state', (data) => {
  // data = { callId, userId, video?: boolean, audio?: boolean }
});

// Kết thúc cuộc gọi
socket.emit('call:end', {
  callId: 'call_xyz',
  duration: 120,                // Thời lượng (giây)
});

// Nhận thông báo kết thúc
socket.on('call:ended', (data) => {
  // data = { callId, duration, endReason: 'normal' }
});

// Cuộc gọi bị busy
socket.on('call:busy', (data) => {
  // data = { callId }
});

// Cuộc gọi timeout (30s không trả lời)
socket.on('call:timeout', (data) => {
  // data = { callId }
});

// Cuộc gọi bị hủy bởi caller
socket.on('call:cancelled', (data) => {
  // data = { callId }
});
```

### Renegotiate (Thay đổi media giữa cuộc gọi)

```javascript
// Ví dụ: Chuyển từ voice → video
socket.emit('call:renegotiate', {
  callId: 'call_xyz',
  sdp: newLocalDescription,
});

socket.on('call:renegotiate', (data) => {
  // data = { callId, sdp }
  handleRenegotiation(data.sdp);
});
```

---

## 🔄 Sync Events

### Đồng Bộ Conversations

```javascript
// Sync conversations đã thay đổi kể từ timestamp
socket.emit('sync:conversations', {
  since: '2026-04-10T00:00:00Z',     // ISO timestamp
  limit: 50,
});

socket.on('sync:conversations_result', (data) => {
  // data = {
  //   conversations: [...],
  //   hasMore: false,
  // }
});
```

### Đồng Bộ Unread Counts

```javascript
socket.emit('sync:unread_counts');

socket.on('sync:unread_result', (data) => {
  // data = {
  //   counts: {
  //     "conv_id_1": 5,
  //     "conv_id_2": 0,
  //     "conv_id_3": 12,
  //   }
  // }
});
```

---

## 📋 Event Summary Table

### Client → Server (Emit)

| Event | Payload | Mô tả |
|-------|---------|--------|
| `message:send` | `{clientMessageId, conversationId, type, content, ...}` | Gửi tin nhắn |
| `message:ack` | `{messageId, conversationId}` | ACK đã nhận tin |
| `message:read` | `{conversationId, messageId}` | Đánh dấu đã đọc |
| `message:recall` | `{messageId, conversationId}` | Thu hồi |
| `message:delete` | `{messageId, conversationId}` | Xóa cho mình |
| `message:react` | `{messageId, conversationId, emoji}` | React |
| `message:forward` | `{messageId, targetConversationIds}` | Forward |
| `message:pin` | `{messageId, conversationId}` | Ghim |
| `typing:start` | `{conversationId}` | Bắt đầu gõ |
| `typing:stop` | `{conversationId}` | Ngừng gõ |
| `heartbeat` | — | Heartbeat 30s |
| `presence:get` | `{userIds}` | Query presence |
| `status:update` | `{text, emoji}` | Custom status |
| `call:initiate` | `{receiverId, type, sdpOffer}` | Gọi điện |
| `call:accept` | `{callId, sdpAnswer}` | Chấp nhận |
| `call:reject` | `{callId, reason}` | Từ chối |
| `call:cancel` | `{callId}` | Hủy gọi |
| `call:end` | `{callId, duration}` | Kết thúc |
| `call:ice-candidate` | `{callId, candidate}` | ICE exchange |
| `call:toggle-video` | `{callId, enabled}` | Toggle camera |
| `call:toggle-audio` | `{callId, enabled}` | Toggle mic |
| `sync:conversations` | `{since, limit}` | Sync convos |
| `sync:unread_counts` | — | Sync unreads |

### Server → Client (On)

| Event | Payload | Mô tả |
|-------|---------|--------|
| `connected` | `{userId, serverTime, onlineFriends, pendingMessages}` | Kết nối OK |
| `message:sent` | `{clientMessageId, messageId, timestamp, status}` | ✓ Đã gửi |
| `message:receive` | `{messageId, sender, type, content, ...}` | Tin nhắn mới |
| `message:delivered` | `{messageId, userId, deliveredAt}` | ✓✓ Đã nhận |
| `message:read_receipt` | `{conversationId, userId, messageId, readAt}` | ✓✓ Đã đọc |
| `message:recalled` | `{messageId, recalledBy}` | Tin bị thu hồi |
| `message:react_update` | `{messageId, userId, emoji, action}` | React update |
| `message:error` | `{clientMessageId, error, code}` | Lỗi |
| `typing:update` | `{conversationId, userId, displayName, isTyping}` | Typing |
| `friend:online` | `{userId, customStatus}` | Bạn online |
| `friend:offline` | `{userId, lastSeen}` | Bạn offline |
| `heartbeat:ack` | `{serverTime}` | Heartbeat ACK |
| `presence:result` | `{users: [...]}` | Kết quả presence |
| `status:changed` | `{userId, text, emoji}` | Status update |
| `call:incoming` | `{callId, caller, type, sdpOffer}` | Cuộc gọi đến |
| `call:accepted` | `{callId, sdpAnswer}` | Đã chấp nhận |
| `call:rejected` | `{callId, reason}` | Bị từ chối |
| `call:cancelled` | `{callId}` | Bị hủy |
| `call:ended` | `{callId, duration, endReason}` | Kết thúc |
| `call:busy` | `{callId}` | Đang bận |
| `call:timeout` | `{callId}` | Timeout 30s |
| `call:ice-candidate` | `{callId, candidate}` | ICE candidate |
| `call:media-state` | `{callId, userId, video?, audio?}` | Media state |
