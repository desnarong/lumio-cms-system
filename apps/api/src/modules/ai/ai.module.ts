import { Logger, Module } from '@nestjs/common';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { AiController } from './ai.controller';
import { AI_CACHE } from './ai.cache';
import { createAiCache } from './ai.cache.redis';
import { createAiProvider, AI_PROVIDER } from './ai.provider';
import { AiService } from './ai.service';

/**
 * AI assistant providers (docs/design/09-ai-assistant.md 9.4). The engine and the
 * result cache sit behind injection tokens: production points `AI_PROVIDER` at an
 * OpenAI-compatible endpoint and can move the cache to Redis, while development
 * runs the key-free local engine in-process.
 */
@Module({
  controllers: [AiController],
  providers: [
    { provide: AI_PROVIDER, useFactory: createAiProvider },
    {
      provide: AI_CACHE,
      useFactory: () =>
        createAiCache({
          redisUrl: process.env.REDIS_URL,
          logger: { warn: (message) => Logger.warn(message, 'AiCache') },
        }),
    },
    AiService,
    SiteGuard,
    RolesGuard,
  ],
  exports: [AiService],
})
export class AiModule {}