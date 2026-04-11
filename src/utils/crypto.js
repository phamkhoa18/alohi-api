const crypto = require('crypto');
const forge = require('node-forge');

/**
 * AES-256-GCM Encrypt
 */
const aesEncrypt = (plaintext, keyHex) => {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12); // GCM uses 12-byte IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
};

/**
 * AES-256-GCM Decrypt
 */
const aesDecrypt = (encryptedHex, keyHex, ivHex, authTagHex) => {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Derive encryption key from password using PBKDF2
 */
const deriveKey = (password, salt, iterations = 100000) => {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
};

/**
 * Generate a random AES-256 key
 */
const generateAESKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate RSA key pair (for E2E)
 */
const generateKeyPair = () => {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  return {
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
  };
};

/**
 * Generate a random salt
 */
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * SHA-256 hash
 */
const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = {
  aesEncrypt,
  aesDecrypt,
  deriveKey,
  generateAESKey,
  generateKeyPair,
  generateSalt,
  sha256,
};
