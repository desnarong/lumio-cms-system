import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { resolveApiLocale, type ApiLocale } from '@lumio/shared';

interface LocaleRequest {
  headers?: Record<string, string | string[] | undefined>;
}

const header = (request: LocaleRequest, name: string): string | undefined => {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Language of the API answer. The admin sends its UI language as `X-Locale`;
 * a plain browser request falls back to `Accept-Language`, then Thai.
 */
export const RequestLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ApiLocale => {
    const request = context.switchToHttp().getRequest<LocaleRequest>();
    return resolveApiLocale(header(request, 'x-locale') ?? header(request, 'accept-language'));
  },
);
