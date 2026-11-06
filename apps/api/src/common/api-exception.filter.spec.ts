import { Logger, type ArgumentsHost } from '@nestjs/common';
import { loginInputSchema } from '@lumio/shared';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ZodError } from 'zod';
import { ApiException } from './api-error';
import { ApiExceptionFilter } from './api-exception.filter';
import { NotModifiedException } from './not-modified';

interface ResponseStub {
  status: Mock;
  json: Mock;
  end: Mock;
}

const hostFor = (response: ResponseStub, headers: Record<string, string> = {}): ArgumentsHost =>
  ({
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ headers }) }),
  }) as unknown as ArgumentsHost;

const responseStub = (): ResponseStub => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  end: vi.fn(),
});

describe('ApiExceptionFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps an ApiException to its code, message and status', () => {
    const response = responseStub();

    new ApiExceptionFilter().catch(ApiException.notFound('ไม่พบเว็บนี้'), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'not_found', message: 'ไม่พบเว็บนี้' }),
    );
  });

  it('keeps only path, code and message of each zod issue', () => {
    const response = responseStub();
    const result = loginInputSchema.safeParse({ email: 'not-an-email', password: 'x' });
    if (result.success) throw new Error('expected a validation failure');

    new ApiExceptionFilter().catch(result.error, hostFor(response));

    const body = response.json.mock.calls[0]?.[0] as { details: Array<Record<string, unknown>> };
    expect(body.details.length).toBeGreaterThan(0);
    for (const detail of body.details) {
      expect(Object.keys(detail).sort()).toEqual(['code', 'message', 'path']);
    }
  });

  it('maps a ZodError to a 400 validation_error with details', () => {
    const response = responseStub();
    let zodError: ZodError | undefined;
    try {
      loginInputSchema.parse({ email: 'not-an-email' });
    } catch (error) {
      zodError = error as ZodError;
    }

    new ApiExceptionFilter().catch(zodError, hostFor(response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'validation_error', details: expect.any(Array) }),
    );
  });

  it('answers a bare 304 for a conditional request without a body', () => {
    const response = responseStub();

    new ApiExceptionFilter().catch(new NotModifiedException(), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(304);
    expect(response.end).toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  it('hides unexpected errors behind a generic Thai message', () => {
    const response = responseStub();

    new ApiExceptionFilter().catch(new Error('database exploded'), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: 'internal_error',
      message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
    });
  });
  it('answers in English when the request asks for it', () => {
    const response = responseStub();

    new ApiExceptionFilter().catch(
      ApiException.notFound('ไม่พบเว็บนี้'),
      hostFor(response, { 'x-locale': 'en' }),
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'not_found', message: 'Site not found' }),
    );
  });

  it('translates messages built from values and zod issue details', () => {
    const response = responseStub();
    const result = loginInputSchema.safeParse({ email: 'not-an-email', password: 'x' });
    if (result.success) throw new Error('expected a validation failure');

    new ApiExceptionFilter().catch(
      result.error,
      hostFor(response, { 'accept-language': 'en-US,en;q=0.9' }),
    );
    const body = response.json.mock.calls[0]?.[0] as {
      message: string;
      details: { message: string }[];
    };

    expect(body.message).toBe('The data sent is not valid');
    for (const detail of body.details) expect(detail.message).not.toMatch(/[฀-฾เ-๿]/u);
  });

  it('keeps Thai for a Thai request', () => {
    const response = responseStub();

    new ApiExceptionFilter().catch(
      ApiException.notFound('ไม่พบเว็บนี้'),
      hostFor(response, { 'x-locale': 'th' }),
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ไม่พบเว็บนี้' }),
    );
  });
});
