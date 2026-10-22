import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { isRole, type Role } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

export const SITE_HEADER = 'x-site-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SiteScopedRequest extends AuthenticatedRequest {
  siteId?: string;
  siteRole?: Role;
}

/**
 * Resolves which site a request targets, from `:siteId` / `:id` or the
 * `X-Site-Id` header, and checks that the signed-in user is a member. The
 * membership lookup runs under the site RLS context so it can never see another
 * tenant's rows.
 */
@Injectable()
export class SiteGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SiteScopedRequest>();
    const user = request.user;
    if (!user) throw ApiException.unauthorized();

    const siteId = this.resolveSiteId(request);
    const membership = await this.db.forSite(siteId, (tx) =>
      tx.siteMember.findFirst({ where: { siteId, userId: user.id }, select: { role: true } }),
    );
    if (!membership) throw ApiException.forbidden('คุณไม่ได้เป็นสมาชิกของเว็บนี้');

    request.siteId = siteId;
    request.siteRole = isRole(membership.role) ? membership.role : 'viewer';
    return true;
  }

  private resolveSiteId(request: SiteScopedRequest): string {
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    const header = request.headers[SITE_HEADER];
    const candidate = params.siteId ?? params.id ?? (Array.isArray(header) ? header[0] : header);
    if (!candidate) {
      throw ApiException.validation('ต้องระบุเว็บที่ต้องการใช้งาน (X-Site-Id)');
    }
    if (!UUID_PATTERN.test(candidate)) {
      throw ApiException.validation('รหัสเว็บไม่ถูกต้อง');
    }
    return candidate;
  }
}
