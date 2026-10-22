import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { ApiException } from '../../common/api-error';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.guard';

/** Injects the user that AuthGuard resolved from the access token. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw ApiException.unauthorized();
    return request.user;
  },
);
