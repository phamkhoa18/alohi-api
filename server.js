require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/database');
const { createRedisClient, disconnectRedis } = require('./src/config/redis');

const { initFirebase } = require('./src/config/firebase');
const { initSocket } = require('./src/socket');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Ensure required directories exist
const ensureDirs = ['uploads', 'logs'];
ensureDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect to Redis
    createRedisClient();

    // 3. Upload directories initialized automatically by upload.service.js

    // 4. Initialize Firebase (optional)
    initFirebase();

    // 5. Create HTTP server
    const server = http.createServer(app);

    // 6. Initialize Socket.IO
    initSocket(server);

    // 7. Start listening
    server.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🚀 ALOHI API v2.0.0                       ║
║                                              ║
║   Server:    http://localhost:${PORT}           ║
║   API:       http://localhost:${PORT}/api       ║
║   Docs:      http://localhost:${PORT}/api-docs  ║
║   Health:    http://localhost:${PORT}/health     ║
║                                              ║
║   Mode:      ${process.env.NODE_ENV || 'development'}                    ║
║   Socket.IO: Enabled                         ║
║                                              ║
╚══════════════════════════════════════════════╝
      `);
    });

    // === Graceful Shutdown ===
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
        await disconnectRedis();
        logger.info('All connections closed. Bye! 👋');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
