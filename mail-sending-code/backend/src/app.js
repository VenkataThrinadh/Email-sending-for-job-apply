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
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
