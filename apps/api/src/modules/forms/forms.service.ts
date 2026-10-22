import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Form as FormRow, FormSubmission as SubmissionRow, Prisma } from '@prisma/client';
import {
  DEFAULT_FORM_SUCCESS_MESSAGE,
  formFieldsSchema,
  formNotifySchema,
  isFormSubmissionStatus,
  isHoneypotFilled,
  submitFormInputSchema,
  validateFormSubmission,
  type CopyFormToLocaleInput,
  type CreateFormInput,
  type Form,
  type FormField,
  type FormNotify,
  type FormSubmission,
  type FormSummary,
  type SubmitFormInput,
  type SubmissionListQuery,
  type UpdateFormInput,
  type UpdateSubmissionInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { Page } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSiteByHost } from '../public/resolve-site';
import { FORM_NOTIFIER, type FormNotifier } from './form-notifier';

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** Reads stored fields defensively: a broken form must never break the page. */
const readFields = (value: unknown): FormField[] => {
  const parsed = formFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

const readNotify = (value: unknown): FormNotify => {
  const parsed = formNotifySchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { emails: [] };
};

const readData = (value: unknown): Record<string, string> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (typeof entry === 'number' || typeof entry === 'boolean') out[key] = String(entry);
  }
  return out;
};

/** `@db.Inet` rejects anything that is not an address, so scrub before writing. */
const safeIp = (value: string | null): string | null =>
  value && /^[0-9a-fA-F:.]+$/.test(value) ? value : null;

const toForm = (row: FormRow): Form => ({
  id: row.id,
  name: row.name ?? 'ฟอร์มติดต่อ',
  fields: readFields(row.fields),
  notify: readNotify(row.notify),
  successMessage: row.successMessage ?? DEFAULT_FORM_SUCCESS_MESSAGE,
  locale: row.locale,
  translationGroupId: row.translationGroupId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toSubmission = (row: SubmissionRow): FormSubmission => ({
  id: row.id,
  formId: row.formId,
  data: readData(row.data),
  status: isFormSubmissionStatus(row.status) ? row.status : 'new',
  createdAt: row.createdAt.toISOString(),
  ip: row.ip,
  userAgent: row.userAgent,
});

export interface SubmissionMeta {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Contact forms and their messages (docs/design/11-data-model.md, 12-api.md 12.1).
 * Every site-scoped query runs inside `forSite`, so RLS keeps one site's messages
 * out of another's inbox. The public submit path resolves the tenant from the
 * host first, exactly like the public delivery routes.
 */
@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    @Inject(FORM_NOTIFIER) private readonly notifier: FormNotifier,
  ) {}

  async list(siteId: string): Promise<FormSummary[]> {
    const { rows, counts, newCounts } = await this.db.forSite(siteId, async (tx) => {
      const rows = await tx.form.findMany({
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 100,
      });
      const counts = await tx.formSubmission.groupBy({
        by: ['formId'],
        _count: { _all: true },
      });
      const newCounts = await tx.formSubmission.groupBy({
        by: ['formId'],
        where: { status: 'new' },
        _count: { _all: true },
      });
      return { rows, counts, newCounts };
    });

    const countOf = (
      entries: { formId: string; _count: { _all: number } }[],
      formId: string,
    ): number => entries.find((entry) => entry.formId === formId)?._count._all ?? 0;

    return rows.map((row) => ({
      id: row.id,
      name: row.name ?? 'ฟอร์มติดต่อ',
      fieldCount: readFields(row.fields).length,
      submissionCount: countOf(counts, row.id),
      newCount: countOf(newCounts, row.id),
      locale: row.locale,
      translationGroupId: row.translationGroupId,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async get(siteId: string, formId: string): Promise<Form> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.form.findUnique({ where: { id: formId } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบฟอร์มนี้');
    return toForm(row);
  }

  async create(siteId: string, input: CreateFormInput, actorId: string): Promise<Form> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const created = await tx.form.create({
        data: {
          siteId,
          name: input.name,
          fields: asJson(input.fields),
          notify: asJson(input.notify),
          successMessage: input.successMessage,
          locale: input.locale ?? null,
        },
      });

      // A form with a language starts its own translation group under its own id,
      // so siblings can link to it later (docs/design/17-i18n.md 17.5).
      if (input.locale) {
        await tx.form.update({ where: { id: created.id }, data: { translationGroupId: created.id } });
      }

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'form.create',
          target: created.id,
          meta: { name: input.name, fields: input.fields.length, locale: input.locale ?? null },
        },
      });

      return created;
    });

    return toForm(row);
  }

  /**
   * Adds a language to a form (docs/design/17-i18n.md 17.5): the fields are copied
   * so the labels can be translated, and both rows join one translation group.
   * Nothing is translated here; the user (or the assistant) decides the wording.
   */
  async copyToLocale(
    siteId: string,
    formId: string,
    input: CopyFormToLocaleInput,
    actorId: string,
  ): Promise<Form> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const source = await tx.form.findUnique({ where: { id: formId } });
      if (!source) throw ApiException.notFound('ไม่พบฟอร์มนี้');

      const locale = input.locale.trim().toLowerCase();
      if (locale === source.locale) throw ApiException.conflict('ฟอร์มนี้เป็นภาษานี้อยู่แล้ว');

      const groupId = source.translationGroupId ?? source.id;
      const existing = await tx.form.findFirst({ where: { translationGroupId: groupId, locale } });
      if (existing) throw ApiException.conflict('มีฟอร์มภาษานี้อยู่แล้ว');

      const created = await tx.form.create({
        data: {
          siteId,
          name: input.name ?? source.name,
          fields: asJson(readFields(source.fields)),
          // Notification settings stay with the source: the inbox is one place.
          notify: asJson(readNotify(source.notify)),
          successMessage: source.successMessage,
          locale,
          translationGroupId: groupId,
        },
      });

      // The source may predate translation groups.
      if (source.translationGroupId === null) {
        await tx.form.update({ where: { id: source.id }, data: { translationGroupId: groupId } });
      }

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'form.copy-locale',
          target: created.id,
          meta: { locale, from: formId },
        },
      });

      return created;
    });

    return toForm(row);
  }

  async update(
    siteId: string,
    formId: string,
    input: UpdateFormInput,
    actorId: string,
  ): Promise<Form> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.form.findUnique({ where: { id: formId }, select: { id: true } });
      if (!current) throw ApiException.notFound('ไม่พบฟอร์มนี้');

      const updated = await tx.form.update({
        where: { id: formId },
        data: {
          name: input.name ?? undefined,
          fields: input.fields === undefined ? undefined : asJson(input.fields),
          notify: input.notify === undefined ? undefined : asJson(input.notify),
          successMessage: input.successMessage ?? undefined,
          locale: input.locale === undefined ? undefined : (input.locale ?? null),
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'form.update',
          target: formId,
          meta: { fields: Object.keys(input) } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });

    return toForm(row);
  }

  async remove(siteId: string, formId: string, actorId: string): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const current = await tx.form.findUnique({ where: { id: formId }, select: { name: true } });
      if (!current) throw ApiException.notFound('ไม่พบฟอร์มนี้');

      await tx.form.delete({ where: { id: formId } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'form.delete',
          target: formId,
          meta: { name: current.name },
        },
      });
    });
  }

  async listSubmissions(
    siteId: string,
    formId: string,
    query: SubmissionListQuery,
  ): Promise<Page<FormSubmission>> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.formSubmission.findMany({
        where: { formId, ...(query.status ? { status: query.status } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
    );

    const items = rows.slice(0, query.limit).map(toSubmission);
    return { items, cursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null };
  }

  async updateSubmission(
    siteId: string,
    formId: string,
    submissionId: string,
    input: UpdateSubmissionInput,
    actorId: string,
  ): Promise<FormSubmission> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.formSubmission.findFirst({
        where: { id: submissionId, formId },
        select: { id: true, status: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบข้อความนี้');

      const updated = await tx.formSubmission.update({
        where: { id: submissionId },
        data: { status: input.status },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'form_submission.update',
          target: submissionId,
          meta: { from: current.status, to: input.status },
        },
      });

      return updated;
    });

    return toSubmission(row);
  }

  /**
   * Public submission (docs/design/12-api.md 12.9). The API is the source of
   * truth for validation, the honeypot silently swallows bots, and a failed
   * notification never loses the message.
   */
  async submitPublic(
    host: string,
    formId: string,
    input: SubmitFormInput,
    meta: SubmissionMeta,
  ): Promise<{ ok: true }> {
    const parsed = submitFormInputSchema.parse(input);
    if (isHoneypotFilled(parsed.honeypot)) return { ok: true };

    const site = await resolveSiteByHost(this.db, host);

    const result = await this.db.forSite(site.id, async (tx) => {
      const row = await tx.form.findUnique({ where: { id: formId } });
      if (!row) throw ApiException.notFound('ไม่พบฟอร์มนี้');

      const form = toForm(row);
      const validation = validateFormSubmission(form.fields, parsed.data);
      if (!validation.ok) {
        throw ApiException.validation('ข้อมูลในฟอร์มยังไม่ถูกต้อง', validation.errors);
      }

      const created = await tx.formSubmission.create({
        data: {
          formId,
          siteId: site.id,
          data: asJson(validation.data),
          ip: safeIp(meta.ip),
          userAgent: meta.userAgent?.slice(0, 400) ?? null,
        },
      });

      return { form, submission: toSubmission(created) };
    });

    try {
      await this.notifier.notify(site.id, result.form, result.submission);
    } catch (error) {
      this.logger.warn(`แจ้งเตือนข้อความใหม่ไม่สำเร็จ: ${String(error)}`);
    }

    return { ok: true };
  }
}
