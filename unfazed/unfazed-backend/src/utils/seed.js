import dotenv from 'dotenv';
import connectDB, { disconnectDB } from '../config/db.js';
import seedDemoData from './seedData.js';
import { ensureTierConfigs } from '../services/entitlementService.js';

dotenv.config();
try {
  await connectDB();
  await ensureTierConfigs();
  await seedDemoData();
  console.log('Demo seed ready. Sign in with ananya@example.com / DemoPass123!');
} finally {
  await disconnectDB();
}
