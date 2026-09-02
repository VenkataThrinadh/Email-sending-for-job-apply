// config/redis.js - Redis connection using ioredis
const Redis = require('ioredis');
require('dotenv').config();

// Create a Redis connection instance
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    // Retry with exponential backoff, max 30 seconds
    const delay = Math.min(times * 50, 30000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

module.exports = redisConnection;
