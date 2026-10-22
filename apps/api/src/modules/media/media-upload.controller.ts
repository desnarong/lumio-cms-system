import { Controller, Param, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { MEDIA_MAX_UPLOAD_BYTES } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { MediaService } from './media.service';

/** Generous, but it stops a leaked token from being used as a file dump. */
const UPLOAD_RATE_LIMIT = { limit: 60, windowMs: 60_000 };

/**
 * Receives the bytes the browser PUTs to a presigned URL (docs/design/12-api.md
 * 12.6 step 3). Step 2 signed the key, mime type and size limit into the URL, so
 * this route needs no session: the token is the authority, and `MediaService`
 * sniffs the bytes before anything is written.
 */
@Controller('v1/media')
export class MediaUploadController {
  constructor(private readonly media: MediaService) {}

  @Put('upload/:token')
  @UseGuards(RateLimitGuard)
  @RateLimit(UPLOAD_RATE_LIMIT)
  async upload(@Param('token') token: string, @Req() request: Request) {
    const body = await readRawBody(request);
    return ok(await this.media.acceptUpload(token, body));
  }
}

/**
 * Streams the request body into memory with a hard cap, so an oversized upload
 * is refused before it can exhaust the process.
 */
const readRawBody = async (request: Request): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    total += buffer.length;
    if (total > MEDIA_MAX_UPLOAD_BYTES) {
      throw ApiException.validation('ไฟล์ใหญ่เกินกำหนด');
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
};