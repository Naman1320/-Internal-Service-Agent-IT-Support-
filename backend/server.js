require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Middleware (setup before DB init)
// ============================================================

// Cybersecurity Helmet & Header Configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"]
    }
  },
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Cybersecurity XSS & Script Sanitization Middleware
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '');
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded. Please wait before making more requests.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many authentication attempts. IP temporary lockout active (15 mins).' }
});
app.use('/api/auth/login', authLimiter);

// ============================================================
// Start server with async DB init
// ============================================================

async function startServer() {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'veridian.db');

  try {
    const db = await initDatabase(DB_PATH);
    console.log('✅ Database connected');

    // Routes
    app.use('/api/auth', require('./routes/auth')(db));
    app.use('/api/agent', require('./routes/agent')(db));
    app.use('/api/tickets', require('./routes/tickets')(db));
    app.use('/api/kb', require('./routes/knowledgeBase')(db));
    app.use('/api/dashboard', require('./routes/dashboard')(db));
    app.use('/api/users', require('./routes/users')(db));

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', service: 'Veridian IT Service Agent', timestamp: new Date().toISOString() });
    });

    // 404
    app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found.' });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'An internal server error occurred. Please try again.' });
    });

    app.listen(PORT, () => {
      console.log(`\n🚀 Veridian IT Service Agent — Backend`);
      console.log(`   Server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Database: ${DB_PATH}\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      db.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      db.close();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
