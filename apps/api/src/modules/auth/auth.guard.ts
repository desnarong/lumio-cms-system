import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../../common/api-error';
import { TokenService } from './token.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const [scheme, token] = typeof header === 'string' ? header.split(' ') : [];

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw ApiException.unauthorized();
    }

    const payload = await this.tokens.verifyAccess(token);
    request.user = { id: payload.sub, email: payload.email };
    return true;
  }
}
