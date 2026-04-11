const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { generalLimiter } = require('./middlewares/rateLimit.middleware');
const { swaggerSpec } = require('./config/swagger');
const logger = require('./utils/logger');

const app = express();

// === Security Middleware ===
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(hpp());
app.use(mongoSanitize());

// === Body Parsing ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === Compression ===
app.use(compression());

// === HTTP Logging ===
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  skip: (req) => req.url === '/health',
}));

// === Rate Limiting (global) ===
app.use('/api', generalLimiter);

// === Swagger Docs ===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Alohi API Documentation',
}));

// === Health Check ===
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'alohi-api',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// === API Routes ===
app.use('/api', routes);

// === Static files (uploads) ===
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// === Error Handling ===
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
