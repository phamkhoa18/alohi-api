const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Initialize Firebase Admin SDK for FCM push notifications
 */
const initFirebase = () => {
  try {
    // Skip if no credentials provided
    if (!process.env.FIREBASE_PROJECT_ID) {
      logger.warn('⚠️  Firebase not configured — push notifications disabled');
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });

    logger.info('✅ Firebase Admin initialized');
    return admin;
  } catch (error) {
    logger.error('Firebase init error:', error.message);
    return null;
  }
};

module.exports = { admin, initFirebase };
