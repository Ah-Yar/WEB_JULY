import http from 'http';
import dotenv from 'dotenv';
import app from './src/app.js';
import connectDB, { disconnectDB } from './src/config/db.js';
import { startNotificationJobs } from './src/services/notificationJobs.js';
import { ensureTierConfigs } from './src/services/entitlementService.js';
import { initializeChatSocket } from './src/sockets/chatSocket.js';
import seedDemoData from './src/utils/seedData.js';

dotenv.config();

const port = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production.');
  process.env.JWT_SECRET = 'unfazed-development-secret-not-for-production';
  console.warn('No JWT_SECRET supplied: using an unsafe local-development secret.');
}

connectDB()
  .then(async ({ isMemory }) => {
    await ensureTierConfigs();
    if (isMemory) {
      await seedDemoData();
      console.log('Demo account ready: ananya@example.com / DemoPass123!');
    }
    const server = http.createServer(app);
    initializeChatSocket(server);
    const reminderJob = startNotificationJobs();
    server.listen(port, '0.0.0.0', () => {
      console.log(`Unfazed API listening on port ${port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing server…`);
      clearInterval(reminderJob);
      server.close(async () => { await disconnectDB(); process.exit(0); });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    console.error('Unable to start API:', error.message);
    process.exit(1);
  });
