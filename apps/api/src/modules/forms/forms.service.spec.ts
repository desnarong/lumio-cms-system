import { describe, expect, it, vi, type Mock } from 'vitest';
import { DEFAULT_CONTACT_FORM_FIELDS, type FormField } from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { SiteFormNotifier } from './form-notifier';
import { FormsService } from './forms.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const FORM_ID = '00000000-0000-4000-8000-0000000000f1';
const SUBMISSION_ID = '00000000-0000-4000-8000-0000000000f2';

const fields: FormField[] = DEFAULT_CONTACT_FORM_FIELDS;

const formRow = (overrides: Record<string, unknown> = {}) => ({
  id: FORM_ID,
  siteId: SITE_ID,
  name: 'ติดต่อเรา',
  fields,
  notify: { emails: [] },
  successMessage: 'ได้รับข้อความแล้ว',
  createdAt: new Date('2026-10-24T00:00:00Z'),
  updatedAt: new Date('2026-10-24T00:00:00Z'),
  ...overrides,
});

const submissionRow = (overrides: Record<string, unknown> = {}) => ({
  id: SUBMISSION_ID,
  formId: FORM_ID,
  siteId: SITE_ID,
  data: { name: 'สมชาย', email: 'somchai@example.com' },
  ip: '127.0.0.1',
  userAgent: 'vitest',
  status: 'new',
  createdAt: new Date('2026-10-24T01:00:00Z'),
  ...overrides,
});

const siteRow = () => ({
  id: SITE_ID,
  ownerId: null,
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th'],
  templateId: null,
  themeTokens: {},
  settings: {},
  plan: 'pro',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
});

interface Stubs {
  db: PrismaService;
  auditLogCreate: Mock;
  formCreate: Mock;
  formUpdate: Mock;
  formDelete: Mock;
  submissionCreate: Mock;
  submissionUpdate: Mock;
  groupBy: Mock;
}

interface StubsOptions {
  form?: unknown;
  formMany?: unknown[];
  submissions?: unknown[];
  domain?: unknown;
  site?: unknown;
}

const stubs = (options: StubsOptions = {}): Stubs => {
  const auditLogCreate = vi.fn().mockResolvedValue({});
  const formCreate = vi.fn().mockResolvedValue(formRow());
  const formUpdate = vi.fn().mockResolvedValue(formRow({ name: 'ฟอร์มใหม่' }));
  const formDelete = vi.fn().mockResolvedValue({});
  const submissionCreate = vi.fn().mockResolvedValue(submissionRow());
  const submissionUpdate = vi.fn().mockResolvedValue(submissionRow({ status: 'read' }));
  const groupBy = vi
    .fn()
    .mockResolvedValueOnce([{ formId: FORM_ID, _count: { _all: 3 } }])
    .mockResolvedValueOnce([{ formId: FORM_ID, _count: { _all: 1 } }]);

  const db = {
    domain: { findUnique: vi.fn().mockResolvedValue(options.domain ?? null) },
    site: { findUnique: vi.fn().mockResolvedValue(options.site ?? null) },
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        form: {
          findMany: vi.fn().mockResolvedValue(options.formMany ?? []),
          findUnique: vi.fn().mockResolvedValue(options.form === undefined ? formRow() : options.form),
          create: formCreate,
          update: formUpdate,
          delete: formDelete,
        },
        formSubmission: {
          findMany: vi.fn().mockResolvedValue(options.submissions ?? []),
          findFirst: vi.fn().mockResolvedValue(submissionRow()),
          create: submissionCreate,
          update: submissionUpdate,
          groupBy,
        },
        auditLog: { create: auditLogCreate },
      }),
    ),
  } as unknown as PrismaService;

  return {
    db,
    auditLogCreate,
    formCreate,
    formUpdate,
    formDelete,
    submissionCreate,
    submissionUpdate,
    groupBy,
  };
};

const service = (all: Stubs, notifier = { notify: vi.fn().mockResolvedValue(undefined) }) =>
  new FormsService(
    all.db,
    { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService,
    notifier,
  );

describe('FormsService', () => {
  it('lists forms with their message counters', async () => {
    const all = stubs({ formMany: [formRow()] });
    const forms = await service(all).list(SITE_ID);

    expect(forms).toHaveLength(1);
    expect(forms[0]).toMatchObject({
      id: FORM_ID,
      name: 'ติดต่อเรา',
      fieldCount: fields.length,
      submissionCount: 3,
      newCount: 1,
    });
  });

  it('reports a missing form instead of an empty one', async () => {
    await expect(service(stubs({ form: null })).get(SITE_ID, FORM_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('creates a form and writes an audit log', async () => {
    const all = stubs();

    const created = await service(all).create(
      SITE_ID,
      {
        name: 'ติดต่อเรา',
        fields,
        notify: { emails: [] },
        successMessage: 'ได้รับข้อความแล้ว',
      },
      USER_ID,
    );

    expect(all.formCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: SITE_ID, name: 'ติดต่อเรา' }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'form.create' }) }),
    );
    expect(created.successMessage).toBe('ได้รับข้อความแล้ว');
  });

  it('updates a form and audits the change', async () => {
    const all = stubs();

    const updated = await service(all).update(SITE_ID, FORM_ID, { name: 'ฟอร์มใหม่' }, USER_ID);

    expect(all.formUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: FORM_ID } }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'form.update' }) }),
    );
    expect(updated.name).toBe('ฟอร์มใหม่');
  });

  it('refuses to update or delete a form of another site', async () => {
    await expect(
      service(stubs({ form: null })).update(SITE_ID, FORM_ID, { name: 'x' }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
    await expect(
      service(stubs({ form: null })).remove(SITE_ID, FORM_ID, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('deletes a form and its messages with an audit log', async () => {
    const all = stubs();
    await service(all).remove(SITE_ID, FORM_ID, USER_ID);

    expect(all.formDelete).toHaveBeenCalledWith({ where: { id: FORM_ID } });
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'form.delete' }) }),
    );
  });

  it('paginates submissions with a cursor', async () => {
    const rows = [submissionRow(), submissionRow({ id: '00000000-0000-4000-8000-0000000000f3' })];
    const page = await service(stubs({ submissions: rows })).listSubmissions(SITE_ID, FORM_ID, {
      limit: 1,
    });

    expect(page.items).toHaveLength(1);
    expect(page.cursor).toBe(SUBMISSION_ID);
  });

  it('marks a message as read and audits it', async () => {
    const all = stubs();
    const updated = await service(all).updateSubmission(
      SITE_ID,
      FORM_ID,
      SUBMISSION_ID,
      { status: 'read' },
      USER_ID,
    );

    expect(all.submissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'read' } }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'form_submission.update' }),
      }),
    );
    expect(updated.status).toBe('read');
  });
});

describe('FormsService.submitPublic', () => {
  const notifier = { notify: vi.fn().mockResolvedValue(undefined) };

  it('stores a valid submission and notifies the owner', async () => {
    const all = stubs({
      domain: { hostname: 'baandoi.example.com', site: siteRow() },
      form: formRow(),
    });
    notifier.notify.mockClear();

    const result = await service(all, notifier).submitPublic(
      'baandoi.example.com',
      FORM_ID,
      { data: { name: 'สมชาย', email: 'somchai@example.com', message: 'สนใจกาแฟ' } },
      { ip: '127.0.0.1', userAgent: 'vitest' },
    );

    expect(result).toEqual({ ok: true });
    expect(all.submissionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          formId: FORM_ID,
          siteId: SITE_ID,
          data: expect.objectContaining({ name: 'สมชาย' }),
        }),
      }),
    );
    expect(notifier.notify).toHaveBeenCalledWith(SITE_ID, expect.anything(), expect.anything());
  });

  it('rejects an incomplete submission with Thai field errors', async () => {
    const all = stubs({
      domain: { hostname: 'baandoi.example.com', site: siteRow() },
      form: formRow(),
    });

    await expect(
      service(all).submitPublic(
        'baandoi.example.com',
        FORM_ID,
        { data: {} },
        { ip: null, userAgent: null },
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.submissionCreate).not.toHaveBeenCalled();
  });

  it('swallows a bot that fills the honeypot', async () => {
    const all = stubs({
      domain: { hostname: 'baandoi.example.com', site: siteRow() },
      form: formRow(),
    });

    const result = await service(all).submitPublic(
      'baandoi.example.com',
      FORM_ID,
      { data: { name: 'บอท' }, honeypot: 'http://spam.example' },
      { ip: null, userAgent: null },
    );

    expect(result).toEqual({ ok: true });
    expect(all.submissionCreate).not.toHaveBeenCalled();
  });

  it('keeps the message even when the notification fails', async () => {
    const all = stubs({
      domain: { hostname: 'baandoi.example.com', site: siteRow() },
      form: formRow(),
    });
    const failing = { notify: vi.fn().mockRejectedValue(new Error('LINE ล่ม')) };

    await expect(
      service(all, failing).submitPublic(
        'baandoi.example.com',
        FORM_ID,
        { data: { name: 'สมชาย', email: 'somchai@example.com', message: 'สวัสดี' } },
        { ip: null, userAgent: null },
      ),
    ).resolves.toEqual({ ok: true });
    expect(all.submissionCreate).toHaveBeenCalledTimes(1);
  });

  it('answers 404 for a host that belongs to no site', async () => {
    await expect(
      service(stubs()).submitPublic(
        'nobody.example.com',
        FORM_ID,
        { data: {} },
        { ip: null, userAgent: null },
      ),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('SiteFormNotifier', () => {
  it('logs the message and pushes to LINE only when a token exists', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const email = {
      sendForSite: vi.fn().mockResolvedValue(true),
      notifyEmails: vi.fn().mockResolvedValue([]),
    };
    const notifier = new SiteFormNotifier(email as never);
    await notifier.notify(
      SITE_ID,
      {
        id: FORM_ID,
        name: 'ติดต่อเรา',
        fields,
        notify: { emails: [], lineToken: 'line-token' },
        successMessage: 'ขอบคุณ',
        locale: null,
        translationGroupId: null,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: SUBMISSION_ID,
        formId: FORM_ID,
        data: { name: 'สมชาย' },
        status: 'new',
        createdAt: '2026-10-24T01:00:00.000Z',
        ip: null,
        userAgent: null,
      },
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://notify-api.line.me/api/notify',
      expect.objectContaining({ method: 'POST' }),
    );
    fetchSpy.mockRestore();
  });
});
