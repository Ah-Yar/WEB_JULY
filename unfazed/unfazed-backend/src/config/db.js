import mongoose from 'mongoose';

let memoryServer;

/**
 * Connects to Atlas/local Mongo when MONGO_URI is configured. For development and the
 * interactive project preview it starts an ephemeral MongoDB automatically, so a first run is
 * usable without credentials. Never allow this fallback in production.
 */
export default async function connectDB() {
  mongoose.set('strictQuery', true);
  const configuredUri = process.env.MONGO_URI?.trim();
  if (configuredUri) {
    await mongoose.connect(configuredUri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    return { isMemory: false };
  }

  if (process.env.NODE_ENV === 'production' || process.env.USE_IN_MEMORY_DB === 'false') {
    throw new Error('MONGO_URI is required in production. Configure MongoDB Atlas or a local MongoDB server.');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'unfazed_demo',
      // Keep the temporary WiredTiger footprint small in local/demo environments.
      args: ['--wiredTigerCacheSizeGB', '0.25']
    }
  });
  await mongoose.connect(memoryServer.getUri());
  console.warn('No MONGO_URI supplied: running with an ephemeral in-memory demo database.');
  return { isMemory: true };
}

export async function disconnectDB() {
  await mongoose.disconnect().catch(() => undefined);
  if (memoryServer) {
    await memoryServer.stop({ doCleanup: true, force: true }).catch((error) => {
      console.warn(`Unable to fully clean up temporary MongoDB: ${error.message}`);
    });
    memoryServer = undefined;
  }
}
