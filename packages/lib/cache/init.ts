import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const get = async <T>(key: string) => redis.get<T>(key);

export const set = async <T>(key: string, value: T, ttlSeconds?: number) => {
  if (ttlSeconds !== undefined) {
    return await redis.set<T>(key, value, { ex: ttlSeconds });
  }

  return await redis.set<T>(key, value);
};

export const invalidate = async (key: string) => {
  return await redis.del(key);
};
