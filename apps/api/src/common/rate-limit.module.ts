import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { createRateLimitStore, type RateLimitStore } from './rate-limit.store';

export const RATE_LIMIT_STORE = 'lumio:rate-limit-store';

/** Closes the Redis connection when the app shuts down. */
@Injectable()
export class RateLimitLifecycle implements OnApplicationShutdown {
  constructor(@Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore) {}

  async onApplicationShutdown(): Promise<void> {
    await this.store.close?.();
  }
}

/**
 * Shares one rate limit counter store across every module. Redis is used when
 * `REDIS_URL` is set so the counters survive across API instances; otherwise an
 * in-process LRU store keeps a single instance correct
 * (docs/design/15-security.md 15.2).
 */
@Global()
@Module({
  providers: [
    {
      provide: RATE_LIMIT_STORE,
      useFactory: (): RateLimitStore =>
        createRateLimitStore({
          redisUrl: process.env.REDIS_URL,
          logger: { warn: (message) => Logger.warn(message, 'RateLimit') },
        }),
    },
    RateLimitLifecycle,
  ],
  exports: [RATE_LIMIT_STORE],
})
export class RateLimitModule {}
