import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { SiteScopedRequest } from '../site/site.guard';
import { ROLES_KEY } from './roles.decorator';

/**
 * The primary enforcement layer for the RBAC matrix (docs/design/13-rbac.md
 * 13.4). The UI hides what a role cannot do, but the API always checks here.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<SiteScopedRequest>();
    const role = request.siteRole;
    if (!role || !required.includes(role)) {
      throw ApiException.forbidden();
    }
    return true;
  }
}
