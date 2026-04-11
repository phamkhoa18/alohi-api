const { getRedis } = require('../config/redis');
const { REDIS_KEYS, TIMEOUTS } = require('../config/constants');
const CallLog = require('../models/CallLog');
const { generateCallId } = require('../utils/helpers');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // === call:initiate ===
  socket.on('call:initiate', async ({ receiverId, type, sdpOffer, callId }) => {
    try {
      const redis = getRedis();
      callId = callId || generateCallId();

      // Check if receiver is busy
      const activeCall = await redis.get(REDIS_KEYS.USER_ACTIVE_CALL(receiverId));
      if (activeCall) {
        socket.emit('call:busy', { callId });
        return;
      }

      // Store call state in Redis
      await redis.hmset(REDIS_KEYS.CALL(callId), {
        callId,
        callerId: userId,
        receiverId,
        type,
        status: 'ringing',
        startedAt: Date.now().toString(),
        callerSocketId: socket.id,
      });
      await redis.expire(REDIS_KEYS.CALL(callId), 120); // 2 min TTL

      // Mark both users as in call
      await redis.set(REDIS_KEYS.USER_ACTIVE_CALL(userId), callId, 'EX', 120);
      await redis.set(REDIS_KEYS.USER_ACTIVE_CALL(receiverId), callId, 'EX', 120);

      // Send to receiver
      io.to(`user:${receiverId}`).emit('call:incoming', {
        callId,
        caller: {
          _id: userId,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar,
        },
        type,
        sdpOffer,
      });

      // Set timeout (30s)
      setTimeout(async () => {
        const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
        if (callData && callData.status === 'ringing') {
          // No answer
          io.to(`user:${userId}`).emit('call:timeout', { callId });
          io.to(`user:${receiverId}`).emit('call:timeout', { callId });

          // Cleanup
          await redis.del(REDIS_KEYS.CALL(callId));
          await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(userId));
          await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(receiverId));

          // Save call log
          await CallLog.create({
            callId,
            caller: userId,
            receiver: receiverId,
            type,
            status: 'no_answer',
            startedAt: new Date(parseInt(callData.startedAt)),
            endedAt: new Date(),
            endReason: 'timeout',
          });
        }
      }, TIMEOUTS.CALL_RING);

    } catch (error) {
      logger.error('call:initiate error:', error);
    }
  });

  // === call:accept ===
  socket.on('call:accept', async ({ callId, sdpAnswer }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      await redis.hmset(REDIS_KEYS.CALL(callId), {
        status: 'answered',
        answeredAt: Date.now().toString(),
        receiverSocketId: socket.id,
      });

      io.to(`user:${callData.callerId}`).emit('call:accepted', {
        callId,
        sdpAnswer,
      });
    } catch (error) {
      logger.error('call:accept error:', error);
    }
  });

  // === call:reject ===
  socket.on('call:reject', async ({ callId, reason }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      io.to(`user:${callData.callerId}`).emit('call:rejected', { callId, reason });

      // Cleanup
      await redis.del(REDIS_KEYS.CALL(callId));
      await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(callData.callerId));
      await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(callData.receiverId));

      // Save log
      await CallLog.create({
        callId,
        caller: callData.callerId,
        receiver: callData.receiverId,
        type: callData.type,
        status: 'rejected',
        startedAt: new Date(parseInt(callData.startedAt)),
        endedAt: new Date(),
        endReason: 'receiver_reject',
      });
    } catch (error) {
      logger.error('call:reject error:', error);
    }
  });

  // === call:cancel ===
  socket.on('call:cancel', async ({ callId }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      io.to(`user:${callData.receiverId}`).emit('call:cancelled', { callId });

      await redis.del(REDIS_KEYS.CALL(callId));
      await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(callData.callerId));
      await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(callData.receiverId));

      await CallLog.create({
        callId,
        caller: callData.callerId,
        receiver: callData.receiverId,
        type: callData.type,
        status: 'cancelled',
        startedAt: new Date(parseInt(callData.startedAt)),
        endedAt: new Date(),
        endReason: 'caller_cancel',
      });
    } catch (error) {
      logger.error('call:cancel error:', error);
    }
  });

  // === call:end ===
  socket.on('call:end', async ({ callId, duration }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      const otherUserId = callData.callerId === userId ? callData.receiverId : callData.callerId;
      io.to(`user:${otherUserId}`).emit('call:ended', {
        callId,
        duration,
        endReason: 'normal',
      });

      // Cleanup
      await redis.del(REDIS_KEYS.CALL(callId));
      await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(callData.callerId));
      await redis.del(REDIS_KEYS.USER_ACTIVE_CALL(callData.receiverId));

      // Save log
      await CallLog.create({
        callId,
        caller: callData.callerId,
        receiver: callData.receiverId,
        type: callData.type,
        status: 'answered',
        startedAt: new Date(parseInt(callData.startedAt)),
        answeredAt: callData.answeredAt ? new Date(parseInt(callData.answeredAt)) : null,
        endedAt: new Date(),
        duration: duration || 0,
        endReason: 'normal',
      });
    } catch (error) {
      logger.error('call:end error:', error);
    }
  });

  // === call:ice-candidate ===
  socket.on('call:ice-candidate', async ({ callId, candidate }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      const targetUserId = callData.callerId === userId ? callData.receiverId : callData.callerId;
      io.to(`user:${targetUserId}`).emit('call:ice-candidate', { callId, candidate });
    } catch (error) {
      logger.error('call:ice-candidate error:', error);
    }
  });

  // === call:toggle-video ===
  socket.on('call:toggle-video', async ({ callId, enabled }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      const targetUserId = callData.callerId === userId ? callData.receiverId : callData.callerId;
      io.to(`user:${targetUserId}`).emit('call:media-state', {
        callId,
        userId,
        video: enabled,
      });
    } catch (error) {
      logger.error('call:toggle-video error:', error);
    }
  });

  // === call:toggle-audio ===
  socket.on('call:toggle-audio', async ({ callId, enabled }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      const targetUserId = callData.callerId === userId ? callData.receiverId : callData.callerId;
      io.to(`user:${targetUserId}`).emit('call:media-state', {
        callId,
        userId,
        audio: enabled,
      });
    } catch (error) {
      logger.error('call:toggle-audio error:', error);
    }
  });

  // === call:renegotiate ===
  socket.on('call:renegotiate', async ({ callId, sdp }) => {
    try {
      const redis = getRedis();
      const callData = await redis.hgetall(REDIS_KEYS.CALL(callId));
      if (!callData) return;

      const targetUserId = callData.callerId === userId ? callData.receiverId : callData.callerId;
      io.to(`user:${targetUserId}`).emit('call:renegotiate', { callId, sdp });
    } catch (error) {
      logger.error('call:renegotiate error:', error);
    }
  });
};
