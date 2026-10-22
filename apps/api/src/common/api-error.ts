import { HttpException, HttpStatus } from '@nestjs/common';

export type ApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'internal_error';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  validation_error: HttpStatus.BAD_REQUEST,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  rate_limited: HttpStatus.TOO_MANY_REQUESTS,
  internal_error: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * Application error that maps onto the standard error envelope from
 * docs/design/12-api.md 12.4: a machine-readable `code` for the client plus a
 * human-readable Thai `message`.
 */
export class ApiException extends HttpException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    details?: unknown[],
  ) {
    super({ error: code, message, details }, STATUS_BY_CODE[code]);
  }

  static unauthorized(message = 'กรุณาเข้าสู่ระบบก่อนใช้งาน'): ApiException {
    return new ApiException('unauthorized', message);
  }

  static forbidden(message = 'คุณไม่มีสิทธิ์ทำรายการนี้'): ApiException {
    return new ApiException('forbidden', message);
  }

  static notFound(message = 'ไม่พบข้อมูลที่ต้องการ'): ApiException {
    return new ApiException('not_found', message);
  }

  static conflict(message: string): ApiException {
    return new ApiException('conflict', message);
  }

  static validation(message: string, details?: unknown[]): ApiException {
    return new ApiException('validation_error', message, details);
  }

  static rateLimited(message = 'ทำรายการถี่เกินไป กรุณารอสักครู่'): ApiException {
    return new ApiException('rate_limited', message);
  }
}
