const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
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

// Custom mongo-sanitize (Express 5 compatible — req.query is getter-only)
const sanitizeValue = (val) => {
  if (typeof val === 'string') return val.replace(/[\$\.]/g, '');
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const cleaned = {};
    for (const key of Object.keys(val)) {
      if (!key.startsWith('$')) cleaned[key] = sanitizeValue(val[key]);
    }
    return cleaned;
  }
  return val;
};
app.use((req, _res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  // Express 5: req.query is getter-only, sanitize in-place
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      req.query[key] = sanitizeValue(req.query[key]);
    }
  }
  next();
});

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
