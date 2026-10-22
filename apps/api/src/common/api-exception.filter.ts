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
import { ApiException, type ApiErrorCode } from './api-error';
import { NotModifiedException } from './not-modified';

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

/**
 * Turns every thrown error into the standard error envelope from
 * docs/design/12-api.md 12.4: `{ error, message, details }` with a Thai
 * message that is safe to show to the user.
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
    response.status(status).json(body);
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
          details: exception.issues,
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
