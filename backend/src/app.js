// app.js - Express application setup
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');

// ─── Route Imports ────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaign');
const queueRoutes = require('./routes/queue');
const domainRoutes = require('./routes/domains');
const logRoutes = require('./routes/logs');
const webhookRoutes = require('./routes/webhook');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────
const rawAllowedOrigins = [
  process.env.FRONTEND_URL,
  'https://email-sending-for-job-apply.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
].filter(Boolean);

const allowedOrigins = rawAllowedOrigins
  .flatMap((url) => url.split(',').map((u) => u.trim()))
  .map((url) => url.replace(/\/+$/, '').toLowerCase());

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '').toLowerCase();
  if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) return true;
  if (cleanOrigin.endsWith('.vercel.app')) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  return true;
};

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Body Parsers ─────────────────────────────────────────────────
// Webhook routes need raw body for signature verification
app.use('/api/webhook', express.json({ type: '*/*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'EmailPro Marketing System',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/webhook', webhookRoutes);

// ─── 404 + Error Handlers ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
