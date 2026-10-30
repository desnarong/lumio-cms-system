import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  installLicenseInputSchema,
  type InstallLicenseInput,
  type LicenseView,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseService } from './license.service';

const ROW_ID = 'default';

/** Reasons a pasted token is still good to store (docs 24.9, 24.10). */
const ACCEPTABLE_REASONS = new Set(['ok', 'grace', 'not_activated']);

/**
 * The licence pasted in ตั้งค่า › ไลเซนส์ (docs/design/24-community-licensing.md
 * 24.10). One row describes this installation, so the table is platform data:
 * no `site_id`, no RLS, like `agency_branding`.
 *
 * `LUMIO_LICENSE` still wins over this row. The owner-facing screen is a
 * convenience, not a second source of truth: a deployment that wants to pin a
 * licence from its config keeps doing exactly that.
 */
@Injectable()
export class LicenseStore implements OnModuleInit {
  private readonly logger = new Logger(LicenseStore.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly license: LicenseService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.load();
    // A stored online licence needs a lease before its features open up.
    this.license.startRenewal();
  }

  /** What this deployment is licensed to run, plus where the token came from. */
  view(): LicenseView {
    const status = this.license.status();
    return {
      ...status,
      source: this.license.source(),
      installedAt: this.license.installedAt(),
    };
  }

  /**
   * Verifies a token, saves it and (for an online licence) asks the vendor for a
   * lease straight away, so the owner sees the result on the same screen.
   */
  async install(
    input: InstallLicenseInput,
    actorId: string,
    auditSiteId: string,
  ): Promise<LicenseView> {
    const parsed = installLicenseInputSchema.parse(input);
    const verified = this.license.verifyToken(parsed.token);
    if (!ACCEPTABLE_REASONS.has(verified.reason)) {
      throw ApiException.validation(refusalMessage(verified.reason));
    }

    const row = await this.db.platformLicense.upsert({
      where: { id: ROW_ID },
      create: { id: ROW_ID, token: parsed.token, updatedBy: actorId },
      update: { token: parsed.token, updatedBy: actorId },
    });

    // Platform data has no site to hang the audit row on, so the change is
    // recorded against the site the owner was working in (same as branding).
    await this.audit.log({
      siteId: auditSiteId,
      userId: actorId,
      action: 'license.install',
      target: ROW_ID,
      meta: {
        plan: verified.plan,
        features: verified.features,
        mode: verified.mode,
        expiresAt: verified.expiresAt,
      },
    });

    this.license.setStoredToken(row.token, row.updatedAt.toISOString());
    this.license.startRenewal();
    await this.license.refresh();
    this.logger.log(`ติดตั้งไลเซนส์ ${verified.plan} โดย ${actorId}`);

    return this.view();
  }

  /** Back to Community; nothing else is touched. */
  async remove(actorId: string, auditSiteId: string): Promise<LicenseView> {
    await this.db.platformLicense.deleteMany({ where: { id: ROW_ID } });
    this.license.setStoredToken('');

    await this.audit.log({
      siteId: auditSiteId,
      userId: actorId,
      action: 'license.remove',
      target: ROW_ID,
      meta: {},
    });
    this.logger.log(`ถอดไลเซนส์โดย ${actorId}`);

    return this.view();
  }

  private async load(): Promise<void> {
    try {
      const row = await this.db.platformLicense.findUnique({ where: { id: ROW_ID } });
      this.license.setStoredToken(row?.token ?? '', row?.updatedAt.toISOString() ?? null);
    } catch (error) {
      // A missing table (old database, failed migration) must not stop the API:
      // the deployment simply runs as Community until it is fixed.
      this.logger.warn(`อ่านไลเซนส์ที่บันทึกไว้ไม่สำเร็จ: ${String(error)}`);
    }
  }
}

/** Plain-language Thai for why a token was refused. */
const refusalMessage = (reason: string): string => {
  switch (reason) {
    case 'bad_signature':
      return 'ไลเซนส์นี้ไม่ได้ออกโดย Lumio (ลายเซ็นไม่ถูกต้อง)';
    case 'expired':
      return 'ไลเซนส์นี้หมดอายุแล้ว กรุณาขอไลเซนส์ใหม่';
    case 'wrong_install':
      return 'นี่เป็นกุญแจของเครื่องอื่น กรุณาใช้ไลเซนส์ที่ได้รับมา ไม่ใช่ไฟล์ lease';
    case 'no_public_key':
      return 'เซิร์ฟเวอร์นี้ยังไม่ได้ตั้งกุญแจสำหรับตรวจไลเซนส์';
    default:
      return 'รูปแบบไลเซนส์ไม่ถูกต้อง กรุณาวางทั้งบรรทัดที่ขึ้นต้นด้วย lumio_lic_v1.';
  }
};
