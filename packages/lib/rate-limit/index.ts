import { Ratelimit } from "@upstash/ratelimit";
import { Cache } from "@saas/cache";

export const rateLimiter = new Ratelimit({
  redis: Cache.redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "rl:api",
});

export const authRateLimit = new Ratelimit({
  redis: Cache.redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth",
});
