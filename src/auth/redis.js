import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

let redisInstance = null;

export function getRedis(options = {}) {
  if (options.fresh || !redisInstance) {
    if (process.env.REDIS_URL && !options.forceMock) {
      try {
        redisInstance = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true
        });
      } catch (err) {
        console.warn('Failed to connect to REDIS_URL, falling back to in-memory Redis:', err.message);
        redisInstance = new RedisMock();
      }
    } else {
      redisInstance = new RedisMock();
    }
  }
  return redisInstance;
}

export async function closeRedis() {
  if (redisInstance) {
    if (typeof redisInstance.quit === 'function') {
      await redisInstance.quit();
    }
    redisInstance = null;
  }
}
