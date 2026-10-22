import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { SiteScopedRequest } from './site.guard';

/** Injects the site id that SiteGuard resolved and verified membership for. */
export const CurrentSite = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<SiteScopedRequest>();
    if (!request.siteId) throw ApiException.forbidden();
    return request.siteId;
  },
);

/** Injects the current user's role inside the resolved site. */
export const CurrentSiteRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Role => {
    const request = context.switchToHttp().getRequest<SiteScopedRequest>();
    if (!request.siteRole) throw ApiException.forbidden();
    return request.siteRole;
  },
);
