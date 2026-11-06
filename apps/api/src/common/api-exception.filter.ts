import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import type { ApiLocale } from '@lumio/shared';
import { ApiException, type ApiErrorCode } from './api-error';
import { translateErrorMessage } from './error-messages';
import { NotModifiedException } from './not-modified';
import { localeOfRequest, type LocaleRequest } from './request-locale.decorator';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: 'validation_error',
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.FORBIDDEN]: 'forbidden',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.CONFLICT]: 'conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limited',
};

interface ErrorBody {
  error: ApiErrorCode;
  message: string;
  details?: unknown[];
}

const isMessageDetail = (detail: unknown): detail is { message: string } =>
  typeof detail === 'object' &&
  detail !== null &&
  typeof (detail as { message?: unknown }).message === 'string';

/** Services throw Thai; an English request gets the English wording (AGENTS.md rule 4). */
const localizeBody = (body: ErrorBody, locale: ApiLocale): ErrorBody => {
  if (locale === 'th') return body;
  return {
    ...body,
    message: translateErrorMessage(body.message, locale),
    ...(body.details && {
      details: body.details.map((detail) =>
        isMessageDetail(detail)
          ? { ...detail, message: translateErrorMessage(detail.message, locale) }
          : detail,
      ),
    }),
  };
};

/**
 * Turns every thrown error into the standard error envelope from
 * docs/design/12-api.md 12.4: `{ error, message, details }` with a message
 * that is safe to show to the user, in Thai or (on request) English.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Conditional requests answer a bare 304: no body and no content type, while
    // the ETag the interceptor set stays on the response
    // (docs/design/12-api.md 12.7).
    if (exception instanceof NotModifiedException) {
      response.status(HttpStatus.NOT_MODIFIED);
      response.end();
      return;
    }

    const { status, body } = this.toError(exception);
    const locale = localeOfRequest(host.switchToHttp().getRequest<LocaleRequest>());
    response.status(status).json(localizeBody(body, locale));
  }

  private toError(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApiException) {
      const payload = exception.getResponse() as ErrorBody;
      return { status: exception.getStatus(), body: payload };
    }

    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: 'validation_error',
          message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
          // Only what a client can act on: zod 4 also attaches long regex
          // patterns and expected/received internals that nobody reads.
          details: exception.issues.map(({ path, code, message }) => ({ path, code, message })),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = STATUS_TO_CODE[status] ?? 'internal_error';
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : (payload as { message?: string | string[] }).message;
      const human = Array.isArray(message) ? message.join(', ') : (message ?? exception.message);
      return { status, body: { error: code, message: human } };
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: 'internal_error', message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' },
    };
  }
}
