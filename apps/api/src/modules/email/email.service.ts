import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  emailSetupProblem,
  emptyEmailSettings,
  readStoredEmailSettings,
  type EmailSettingsInput,
  type EmailSettingsView,
  type EmailTestResult,
  type StoredEmailSettings,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { Mailer } from '../../common/mailer';
import { decryptSecret, encryptSecret, secretsKey } from '../../common/secret-box';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  deliverEmail,
  displayFrom,
  type EmailDeliveryConfig,
  type OutgoingEmail,
} from './email.delivery';

export const EMAIL_DELIVERY = 'EMAIL_DELIVERY';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const uniqueEmails = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
};

const emptyStored = (): StoredEmailSettings => {
  const base = emptyEmailSettings();
  return {
    enabled: base.enabled,
    provider: base.provider,
    fromName: base.fromName,
    fromEmail: base.fromEmail,
    notifyEmails: base.notifyEmails,
    smtp: { host: '', port: 465, secure: true, username: '' },
    resend: {},
    updatedAt: new Date(0).toISOString(),
  };
};

/**
 * Site-owned outgoing mail (docs/design/03-scope.md "ฟอร์มติดต่อ + แจ้งเตือน
 * Email"). Each site stores its own SMTP mailbox or Resend key, encrypted with
 * `SECRETS_ENCRYPTION_KEY`, so a contact form really reaches the owner's inbox
 * and no operator has to relay messages by hand.
 *
 * A site that has not connected a mailbox keeps working: the platform mailer
 * (env `RESEND_API_KEY`) is used as before, and with no key at all the message is
 * logged instead of failing the visitor's submission.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: Mailer,
    @Optional()
    @Inject(EMAIL_DELIVERY)
    private readonly deliver: typeof deliverEmail = deliverEmail,
  ) {}

  async view(siteId: string): Promise<EmailSettingsView> {
    const settings = await this.readSiteSettings(siteId);
    const stored = readStoredEmailSettings(settings);
    return this.toView(stored);
  }

  async update(
    siteId: string,
    input: EmailSettingsInput,
    actorId: string,
  ): Promise<EmailSettingsView> {
    const stored = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const existing = readStoredEmailSettings(site.settings);
      const merged = this.mergeInput(input, existing);

      const settings = asRecord(site.settings);
      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...settings, email: merged }) },
      });
      return merged;
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'email.settings.update',
      target: siteId,
      meta: {
        provider: stored.provider,
        enabled: stored.enabled,
        fromEmail: stored.fromEmail,
        notifyEmails: stored.notifyEmails,
      },
    });

    return this.toView(stored);
  }

  /** Sends a real message so the owner can prove the setup before publishing. */
  async test(siteId: string, to: string, actorId: string): Promise<EmailTestResult> {
    const stored = readStoredEmailSettings(await this.readSiteSettings(siteId));
    if (!stored) {
      return { sent: false, message: 'ยังไม่ได้ตั้งค่าอีเมลของเว็บนี้ กรุณาบันทึกการตั้งค่าก่อนทดสอบ' };
    }

    const problem = this.problemOf(stored);
    if (problem) return { sent: false, message: problem };

    const result = await this.sendWith(stored, {
      to,
      subject: 'ทดสอบการส่งอีเมลจาก Lumio',
      text: [
        'อีเมลฉบับนี้ส่งจากระบบ Lumio เพื่อยืนยันว่าการตั้งค่าอีเมลของเว็บทำงานแล้ว',
        '',
        `ส่งจาก: ${displayFrom(stored.fromName, stored.fromEmail)}`,
        'เมื่อได้รับอีเมลนี้ ข้อความจากฟอร์มติดต่อจะส่งมาถึงคุณได้ตามปกติ',
      ].join('\n'),
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'email.test',
      target: siteId,
      meta: { provider: stored.provider, sent: result.sent },
    });

    return result.sent
      ? { sent: true, message: `ส่งอีเมลทดสอบไปที่ ${to} แล้ว กรุณาตรวจกล่องจดหมาย (รวมถึงโฟลเดอร์สแปม)` }
      : { sent: false, message: result.message };
  }

  /** Default inbox for contact forms that do not name their own recipients. */
  async notifyEmails(siteId: string): Promise<string[]> {
    const stored = readStoredEmailSettings(await this.readSiteSettings(siteId));
    return stored?.notifyEmails ?? [];
  }

  /**
   * Sends one operational message for a site. Never throws: a mail outage must
   * not lose a contact-form submission that is already stored.
   */
  async sendForSite(siteId: string, message: OutgoingEmail): Promise<boolean> {
    let stored: StoredEmailSettings | null = null;
    try {
      stored = readStoredEmailSettings(await this.readSiteSettings(siteId));
    } catch (error) {
      this.logger.warn(`อ่านการตั้งค่าอีเมลไม่สำเร็จ: ${String(error)}`);
      return false;
    }

    if (!stored) return this.mailer.send(message);
    if (!stored.enabled) return false;

    const problem = this.problemOf(stored);
    if (problem) {
      // A half-configured mailbox falls back to the platform sender instead of
      // dropping the message; the settings screen explains what is missing.
      this.logger.warn(`การตั้งค่าอีเมลของเว็บ ${siteId} ยังไม่สมบูรณ์: ${problem}`);
      return this.mailer.send(message);
    }

    const result = await this.sendWith(stored, message);
    if (!result.sent) {
      this.logger.warn(`ส่งอีเมลของเว็บ ${siteId} ไม่สำเร็จ: ${result.message}`);
    }
    return result.sent;
  }

  private async sendWith(
    stored: StoredEmailSettings,
    message: OutgoingEmail,
  ): Promise<EmailTestResult> {
    const config = this.deliveryConfig(stored);
    if (!config) return { sent: false, message: 'ข้อมูลผู้ให้บริการอีเมลไม่ครบถ้วน' };

    try {
      const result = await this.deliver(config, message);
      return {
        sent: result.sent,
        message: result.sent ? 'ส่งอีเมลแล้ว' : (result.error ?? 'ส่งอีเมลไม่สำเร็จ'),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { sent: false, message: `ส่งอีเมลไม่สำเร็จ: ${reason.slice(0, 200)}` };
    }
  }

  /** Secrets stay encrypted at rest; a missing key is reported as "not usable". */
  private deliveryConfig(stored: StoredEmailSettings): EmailDeliveryConfig | null {
    if (stored.provider === 'smtp') {
      const smtp = stored.smtp;
      if (!smtp || !smtp.password || secretsKey().length === 0) return null;
      try {
        return {
          provider: 'smtp',
          fromName: stored.fromName,
          fromEmail: stored.fromEmail,
          smtp: {
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            username: smtp.username.length > 0 ? smtp.username : stored.fromEmail,
            password: decryptSecret(smtp.password),
          },
        };
      } catch {
        return null;
      }
    }

    const apiKey = stored.resend?.apiKey;
    if (!apiKey) return null;
    try {
      return {
        provider: 'resend',
        fromName: stored.fromName,
        fromEmail: stored.fromEmail,
        resend: { apiKey: decryptSecret(apiKey) },
      };
    } catch {
      return null;
    }
  }

  private problemOf(stored: StoredEmailSettings): string | null {
    const input: Pick<EmailSettingsInput, 'provider' | 'smtp' | 'resend'> = {
      provider: stored.provider,
      smtp: stored.smtp
        ? {
            host: stored.smtp.host,
            port: stored.smtp.port,
            secure: stored.smtp.secure,
            username: stored.smtp.username,
          }
        : undefined,
      resend: stored.resend ? {} : undefined,
    };
    return emailSetupProblem(input, Boolean(stored.smtp?.password), Boolean(stored.resend?.apiKey));
  }

  private mergeInput(
    input: EmailSettingsInput,
    existing: StoredEmailSettings | null,
  ): StoredEmailSettings {
    const password =
      input.smtp?.password && input.smtp.password.length > 0
        ? encryptSecret(input.smtp.password)
        : input.smtp?.clearPassword
          ? undefined
          : existing?.smtp?.password;

    const apiKey =
      input.resend?.apiKey && input.resend.apiKey.length > 0
        ? encryptSecret(input.resend.apiKey)
        : input.resend?.clearApiKey
          ? undefined
          : existing?.resend?.apiKey;

    const problem = emailSetupProblem(
      { provider: input.provider, smtp: input.smtp, resend: input.resend },
      Boolean(password),
      Boolean(apiKey),
    );
    if (input.enabled && problem) {
      throw ApiException.validation(
        input.provider === 'smtp' ? 'กรอกรหัสผ่านอีเมลด้วย' : 'กรอกคีย์ Resend ด้วย',
        [],
      );
    }

    return {
      enabled: input.enabled,
      provider: input.provider,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      notifyEmails: uniqueEmails(input.notifyEmails),
      smtp:
        input.provider === 'smtp' && input.smtp
          ? {
              host: input.smtp.host,
              port: input.smtp.port,
              secure: input.smtp.secure,
              username: input.smtp.username,
              ...(password ? { password } : {}),
            }
          : existing?.smtp
            ? {
                host: existing.smtp.host,
                port: existing.smtp.port,
                secure: existing.smtp.secure,
                username: existing.smtp.username,
                ...(password ? { password } : {}),
              }
            : undefined,
      resend:
        input.provider === 'resend' || apiKey
          ? { ...(apiKey ? { apiKey } : {}) }
          : existing?.resend
            ? { ...existing.resend }
            : undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  private toView(stored: StoredEmailSettings | null): EmailSettingsView {
    const value = stored ?? emptyStored();
    const smtp = value.smtp ?? { host: '', port: 465, secure: true, username: '' };
    const input: Pick<EmailSettingsInput, 'provider' | 'smtp' | 'resend'> = {
      provider: value.provider,
      smtp: {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        username: smtp.username,
      },
      resend: value.resend ? {} : undefined,
    };
    const problem = emailSetupProblem(
      input,
      Boolean(smtp.password),
      Boolean(value.resend?.apiKey),
    );

    return {
      enabled: value.enabled,
      provider: value.provider,
      fromName: value.fromName,
      fromEmail: value.fromEmail,
      notifyEmails: value.notifyEmails,
      smtp: {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        username: smtp.username,
        hasPassword: Boolean(smtp.password),
      },
      resend: { hasApiKey: Boolean(value.resend?.apiKey) },
      platformReady: this.mailer.configured(),
      ready: stored !== null && value.enabled && problem === null,
      updatedAt: stored ? value.updatedAt : null,
    };
  }

  private async readSiteSettings(siteId: string): Promise<unknown> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return site.settings;
  }
}
