const KeyBundle = require('../models/KeyBundle');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class EncryptionService {
  /**
   * Upload key bundle
   */
  async uploadKeyBundle(userId, deviceId, bundleData) {
    const { identityPublicKey, signedPreKey, oneTimePreKeys } = bundleData;

    const bundle = await KeyBundle.findOneAndUpdate(
      { user: userId, deviceId },
      {
        user: userId,
        deviceId,
        identityPublicKey,
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: signedPreKey.publicKey,
          signature: signedPreKey.signature,
          createdAt: new Date(),
        },
        oneTimePreKeys: oneTimePreKeys.map(k => ({
          keyId: k.keyId,
          publicKey: k.publicKey,
          isUsed: false,
        })),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Update user publicKey
    await User.findByIdAndUpdate(userId, {
      publicKey: identityPublicKey,
      keyBundleId: bundle._id,
    });

    logger.info(`Key bundle uploaded for user ${userId}, device ${deviceId}`);
    return bundle;
  }

  /**
   * Fetch key bundle for a user (consumes one OTP key)
   */
  async fetchKeyBundle(targetUserId, requesterId) {
    const bundle = await KeyBundle.findOne({
      user: targetUserId,
      isActive: true,
    });

    if (!bundle) {
      throw ApiError.notFound('Key bundle không tồn tại cho user này');
    }

    // Find an unused one-time pre-key
    const oneTimePreKey = bundle.oneTimePreKeys.find(k => !k.isUsed);

    if (oneTimePreKey) {
      // Mark as used
      oneTimePreKey.isUsed = true;
      oneTimePreKey.usedBy = requesterId;
      oneTimePreKey.usedAt = new Date();
      await bundle.save();
    }

    // Check if running low on OTP keys
    const remainingKeys = bundle.oneTimePreKeys.filter(k => !k.isUsed).length;
    if (remainingKeys < 10) {
      logger.warn(`Low OTP keys for user ${targetUserId}: ${remainingKeys} remaining`);
      // TODO: Notify user to upload more keys
    }

    return {
      identityPublicKey: bundle.identityPublicKey,
      signedPreKey: {
        keyId: bundle.signedPreKey.keyId,
        publicKey: bundle.signedPreKey.publicKey,
        signature: bundle.signedPreKey.signature,
      },
      oneTimePreKey: oneTimePreKey ? {
        keyId: oneTimePreKey.keyId,
        publicKey: oneTimePreKey.publicKey,
      } : null,
    };
  }

  /**
   * Upload additional one-time pre-keys
   */
  async uploadPreKeys(userId, deviceId, newKeys) {
    const bundle = await KeyBundle.findOne({ user: userId, deviceId });
    if (!bundle) {
      throw ApiError.notFound('Key bundle không tồn tại');
    }

    const keyEntries = newKeys.map(k => ({
      keyId: k.keyId,
      publicKey: k.publicKey,
      isUsed: false,
    }));

    bundle.oneTimePreKeys.push(...keyEntries);
    await bundle.save();

    const remaining = bundle.oneTimePreKeys.filter(k => !k.isUsed).length;
    logger.info(`Added ${newKeys.length} pre-keys for user ${userId}. Total available: ${remaining}`);

    return { added: newKeys.length, remaining };
  }

  /**
   * Get remaining pre-key count
   */
  async getPreKeyCount(userId, deviceId) {
    const bundle = await KeyBundle.findOne({ user: userId, deviceId });
    if (!bundle) return 0;
    return bundle.oneTimePreKeys.filter(k => !k.isUsed).length;
  }
}

module.exports = new EncryptionService();
