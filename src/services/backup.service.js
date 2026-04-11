const CloudBackup = require('../models/CloudBackup');
const User = require('../models/User');
const { generateBackupId } = require('../utils/helpers');
const { sha256 } = require('../utils/crypto');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class BackupService {
  /**
   * Get backup status/settings
   */
  async getStatus(userId) {
    const user = await User.findById(userId).select('settings.backup');
    const lastBackup = await CloudBackup.findOne({
      user: userId,
      status: 'completed',
    }).sort({ createdAt: -1 });

    return {
      settings: user.settings.backup,
      lastBackup: lastBackup ? {
        backupId: lastBackup.backupId,
        createdAt: lastBackup.createdAt,
        size: lastBackup.fileSize,
        messageCount: lastBackup.messageCount,
        conversationCount: lastBackup.conversationCount,
      } : null,
    };
  }

  /**
   * Update backup settings
   */
  async updateSettings(userId, settings) {
    const updates = {};
    if (settings.enabled !== undefined) updates['settings.backup.enabled'] = settings.enabled;
    if (settings.frequency) updates['settings.backup.frequency'] = settings.frequency;
    if (settings.includeMedia !== undefined) updates['settings.backup.includeMedia'] = settings.includeMedia;

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true });
    return user.settings.backup;
  }

  /**
   * Create a new backup record
   */
  async createBackup(userId, backupData) {
    const { encryptedData, metadata } = backupData;

    const backupId = generateBackupId();
    const checksum = sha256(encryptedData);

    const backup = await CloudBackup.create({
      user: userId,
      backupId,
      type: metadata.type || 'full',
      includesMedia: metadata.includesMedia || false,
      conversationCount: metadata.conversationCount,
      messageCount: metadata.messageCount,
      mediaCount: metadata.mediaCount,
      encryptedFileUrl: metadata.fileUrl,
      encryptionSalt: metadata.salt,
      encryptionIv: metadata.iv,
      fileSize: metadata.fileSize,
      checksum,
      deviceName: metadata.deviceName,
      appVersion: metadata.appVersion,
      fromTimestamp: metadata.fromTimestamp,
      toTimestamp: metadata.toTimestamp || new Date(),
      status: 'completed',
      completedAt: new Date(),
    });

    // Update user backup info
    await User.findByIdAndUpdate(userId, {
      'settings.backup.lastBackupAt': new Date(),
      'settings.backup.lastBackupSize': metadata.fileSize,
    });

    logger.info(`Backup created: ${backupId} for user ${userId}`);
    return backup;
  }

  /**
   * List backups for a user
   */
  async listBackups(userId) {
    return CloudBackup.find({
      user: userId,
      status: { $in: ['completed', 'in_progress'] },
    })
      .sort({ createdAt: -1 })
      .select('backupId type status includesMedia conversationCount messageCount fileSize createdAt completedAt');
  }

  /**
   * Get backup for restore
   */
  async getBackup(userId, backupId) {
    const backup = await CloudBackup.findOne({
      user: userId,
      backupId,
      status: 'completed',
    });

    if (!backup) {
      throw ApiError.notFound('Backup không tồn tại');
    }

    return backup;
  }

  /**
   * Delete a backup
   */
  async deleteBackup(userId, backupId) {
    const backup = await CloudBackup.findOneAndDelete({
      user: userId,
      backupId,
    });

    if (!backup) {
      throw ApiError.notFound('Backup không tồn tại');
    }

    // TODO: Delete file from cloud storage
    logger.info(`Backup deleted: ${backupId}`);
    return backup;
  }
}

module.exports = new BackupService();
