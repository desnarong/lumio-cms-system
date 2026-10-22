import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { resolveAllowedOrigins } from './common/origin.guard';
import { ResponseInterceptor } from './common/response.interceptor';
import { securityHeadersMiddleware } from './common/security-headers';
import { resolveTrustProxy } from './common/trust-proxy';
import { mediaLocalDir, mediaStorageDriver } from './modules/media/media.config';
import { resolveTemplatesDirectory } from './modules/templates/template-store';

async function bootstrap(): Promise<void> {
  //  keeps the exact bytes Stripe signs, so the webhook can verify it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Payment slips arrive as a base64 data URL (max 4MB of image). The default
  // 100kb JSON limit would reject them; every endpoint still validates its own
  // payload, and the slip route is rate limited.
  app.useBodyParser('json', { limit: '6mb' });
  app.setGlobalPrefix('api');
  app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({
    origin: resolveAllowedOrigins(),
    credentials: true,
  });

  // Security headers go on before the static mounts so uploaded media and
  // template previews carry them too (docs/design/15-security.md 15.2).
  app.use(securityHeadersMiddleware({ hsts: process.env.NODE_ENV === 'production' }));

  // Development serves uploaded files itself; production points
  // MEDIA_PUBLIC_BASE_URL at the CDN and this mount stays quiet.
  if (mediaStorageDriver() === 'local') {
    app.useStaticAssets(mediaLocalDir(), {
      prefix: '/media/',
      maxAge: '1y',
      immutable: true,
    });
  }

  // Template previews are public marketing images, served straight from the
  // folder the packs live in (docs/design/08-theme-design-panel.md 8.2).
  try {
    app.useStaticAssets(resolveTemplatesDirectory(), { prefix: '/templates/', maxAge: '7d' });
  } catch (error) {
    Logger.warn(
      `ไม่พบโฟลเดอร์เทมเพลต จะไม่เสิร์ฟภาพตัวอย่าง: ${error instanceof Error ? error.message : ''}`,
      'Bootstrap',
    );
  }

  const port = Number(process.env.API_PORT ?? 49100);
  await app.listen(port);
  Logger.log(`Lumio API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
