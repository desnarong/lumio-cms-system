import {
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_META, isFeatureFlagKey, type FeatureFlagKey } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { SiteScopedRequest } from '../site/site.guard';
import { FeaturesService } from './features.service';

const FEATURE_KEY = 'lumio:feature';

/** Marks a controller or route as belonging to one switchable capability. */
export const RequireFeature = (feature: FeatureFlagKey) => SetMetadata(FEATURE_KEY, feature);

/**
 * Refuses a request when the site (or the platform) closed the capability. It
 * runs after SiteGuard, which is what puts the site id on the request.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly features: FeaturesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<unknown>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isFeatureFlagKey(feature)) return true;

    const request = context.switchToHttp().getRequest<SiteScopedRequest>();
    const siteId = request.siteId;
    if (!siteId) throw ApiException.unauthorized();

    if (await this.features.isEnabled(siteId, feature)) return true;

    const meta = FEATURE_FLAG_META[feature];
    throw ApiException.forbidden(
      `ส่วน “${meta.label}” ปิดอยู่สำหรับเว็บนี้ — เปิดได้ที่ ตั้งค่า › ส่วนเสริม`,
    );
  }
}
