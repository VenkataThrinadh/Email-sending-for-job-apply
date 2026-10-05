// server.js - Entry point: initializes DB then starts Express
const app = require('./app');
const prisma = require('./lib/prisma');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('\n🚀 EmailPro Marketing System — Backend Starting...\n');

  // 1. Test DB connection
  try {
    await prisma.$connect();
    console.log('✅ MySQL connected successfully via Prisma');
  } catch (dbErr) {
    console.error('❌ Cannot start server: DB connection failed. Check your .env settings.');
    console.error(dbErr);
    process.exit(1);
  }

  // 3. Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 API Base:    http://localhost:${PORT}/api`);
    console.log(`❤️  Health:     http://localhost:${PORT}/health`);
    console.log(`🔔 Webhook:    http://localhost:${PORT}/api/webhook/email-status`);
    console.log(`\n🏃 Start worker separately: npm run worker\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📴 SIGTERM received. Shutting down gracefully...');
    await prisma.$disconnect();
    server.close(() => {
      console.log('👋 HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    process.exit(1);
  });
};

startServer();
