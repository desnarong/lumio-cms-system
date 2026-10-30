import { Injectable, Logger } from '@nestjs/common';
import {
  mergeAgencyBranding,
  type AgencyBranding,
  type AgencyBrandingInput,
  type AgencyView,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../prisma/prisma.service';

const ROW_ID = 'default';

/**
 * White-label branding of this installation (docs/PROGRESS.md "งานนอก MVP").
 *
 * It is platform data: there is one row per deployment, so the table has no
 * `site_id` and cannot be reached through the site-scoped client. Changing it is
 * a paid capability, checked against the licence on every write.
 */
@Injectable()
export class AgencyService {
  private readonly logger = new Logger(AgencyService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly license: LicenseService,
  ) {}

  licensed(): boolean {
    return this.license.hasFeature('whitelabel');
  }

  async get(): Promise<AgencyView> {
    const row = await this.db.agencyBranding.findUnique({ where: { id: ROW_ID } });
    return { ...mergeAgencyBranding(row as Partial<AgencyBranding> | null), licensed: this.licensed() };
  }

  async update(
    input: AgencyBrandingInput,
    actorId: string,
    auditSiteId: string,
  ): Promise<AgencyView> {
    if (!this.licensed()) {
      throw ApiException.forbidden(
        'การเปลี่ยนแบรนด์ของระบบต้องมีไลเซนส์ที่รวมความสามารถ white-label',
      );
    }

    const current = await this.get();
    const next: AgencyBranding = {
      brandName: input.brandName ?? current.brandName,
      logoUrl: input.logoUrl === undefined ? current.logoUrl : input.logoUrl,
      supportEmail: input.supportEmail === undefined ? current.supportEmail : input.supportEmail,
      hideBranding: input.hideBranding ?? current.hideBranding,
      accentColor: input.accentColor === undefined ? current.accentColor : input.accentColor,
    };

    const row = await this.db.agencyBranding.upsert({
      where: { id: ROW_ID },
      create: { id: ROW_ID, ...next },
      update: next,
    });

    // Platform-level data cannot be written into the site-scoped audit table, so
    // the change is recorded against the site the owner was working in.
    await this.audit.log({
      siteId: auditSiteId,
      userId: actorId,
      action: 'agency.branding.update',
      target: ROW_ID,
      meta: { fields: Object.keys(input) },
    });
    this.logger.log(`อัปเดตแบรนด์ของระบบโดย ${actorId}`);

    return { ...mergeAgencyBranding(row as Partial<AgencyBranding>), licensed: true };
  }
}
