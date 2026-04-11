const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alohi';

    const conn = await mongoose.connect(uri, {
      // Mongoose 8 defaults are good, but we can be explicit
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    // Connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB (for graceful shutdown)
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
};

module.exports = { connectDB, disconnectDB };
