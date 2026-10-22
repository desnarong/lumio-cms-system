import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CONTACT_FORM_FIELDS,
  type Form,
  type FormSubmission,
  type FormSummary,
} from '@lumio/shared';
import { FormsView, formatDateTime, type FormsViewProps } from './FormsPage.js';
import type { FormsController } from './useForms.js';

const summary = (overrides: Partial<FormSummary> = {}): FormSummary => ({
  id: 'f1',
  name: 'ติดต่อเรา',
  fieldCount: 4,
  submissionCount: 2,
  newCount: 1,
  locale: 'th',
  translationGroupId: 'f1',
  updatedAt: '2026-10-24T03:00:00.000Z',
  ...overrides,
});

const form = (): Form => ({
  id: 'f1',
  name: 'ติดต่อเรา',
  fields: DEFAULT_CONTACT_FORM_FIELDS,
  notify: { emails: [] },
  successMessage: 'ได้รับข้อความแล้ว',
  locale: 'th',
  translationGroupId: 'f1',
  createdAt: '2026-10-01T03:00:00.000Z',
  updatedAt: '2026-10-24T03:00:00.000Z',
});

const submission = (overrides: Partial<FormSubmission> = {}): FormSubmission => ({
  id: 'sub-1',
  formId: 'f1',
  data: { name: 'สมชาย ใจดี', message: 'สนใจกาแฟครับ' },
  status: 'new',
  createdAt: '2026-10-24T01:20:00.000Z',
  ip: null,
  userAgent: null,
  ...overrides,
});

const controller = (overrides: Partial<FormsController> = {}): FormsController => ({
  summaries: [summary()],
  selectedId: 'f1',
  selected: summary(),
  selectedForm: form(),
  submissions: [submission()],
  status: 'all',
  loading: false,
  inboxLoading: false,
  error: null,
  cursor: null,
  select: vi.fn(),
  setStatus: vi.fn(),
  reload: vi.fn(),
  loadMore: vi.fn(),
  archive: vi.fn(),
  markRead: vi.fn(),
  create: vi.fn(),
  copyToLocale: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  ...overrides,
});

const props = (overrides: Partial<FormsViewProps> = {}): FormsViewProps => ({
  controller: controller(),
  canManage: true,
  locales: ['th', 'en'],
  onCreate: vi.fn(),
  onEdit: vi.fn(),
  onRemove: vi.fn(),
  onAddLanguage: vi.fn(),
  ...overrides,
});

const render = (overrides: Partial<FormsViewProps> = {}): string =>
  renderToStaticMarkup(<FormsView {...props(overrides)} />);

describe('formatDateTime', () => {
  it('formats an ISO timestamp with the time', () => {
    expect(formatDateTime('2026-10-24T01:20:00.000Z')).toBe('24/10/2026 01:20');
  });

  it('returns an empty string for junk instead of throwing', () => {
    expect(formatDateTime('ไม่ใช่วันที่')).toBe('');
  });
});

describe('FormsView', () => {
  it('lists the forms with their counters and new-message badge', () => {
    const html = render();
    expect(html).toContain('ติดต่อเรา');
    expect(html).toContain('4 ช่อง · 2 ข้อความ');
    expect(html).toContain('1 ใหม่');
    expect(html).toContain('ข้อความใหม่ 1 รายการ');
  });

  it('labels each answer with the field label from the form', () => {
    const html = render();
    expect(html).toContain('ชื่อของคุณ');
    expect(html).toContain('สมชาย ใจดี');
    expect(html).toContain('ข้อความ');
    expect(html).toContain('สนใจกาแฟครับ');
    expect(html).toContain('24/10/2026 01:20');
  });

  it('offers to read and archive a new message', () => {
    const html = render();
    expect(html).toContain('อ่านแล้ว');
    expect(html).toContain('เก็บเข้าคลัง');
    expect(html).toContain('ลบฟอร์ม');
  });

  it('hides every write action from a read-only role', () => {
    const html = render({ canManage: false });
    expect(html).not.toContain('สร้างฟอร์ม');
    expect(html).not.toContain('ลบฟอร์ม');
    expect(html).not.toContain('อ่านแล้ว</button>');
    expect(html).toContain('ติดต่อเรา');
  });

  it('explains an empty inbox', () => {
    const html = render({ controller: controller({ submissions: [] }) });
    expect(html).toContain('ยังไม่มีข้อความ');
  });

  it('offers the first form when the site has none', () => {
    const html = render({
      controller: controller({ summaries: [], selectedId: null, selected: null, submissions: [] }),
    });
    expect(html).toContain('ยังไม่มีฟอร์มในเว็บนี้');
    expect(html).toContain('สร้างฟอร์ม');
  });

  it('shows skeletons while loading and a retry when it fails', () => {
    expect(render({ controller: controller({ loading: true, summaries: [] }) })).toContain(
      'ui-skeleton',
    );
    const failed = render({
      controller: controller({ summaries: [], error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองอีกครั้ง' }),
    });
    expect(failed).toContain('เปิดรายการฟอร์มไม่สำเร็จ');
    expect(failed).toContain('ลองอีกครั้ง');
  });

  it('offers load-more only when there is a next page', () => {
    expect(render({ controller: controller({ cursor: 'sub-1' }) })).toContain('ดูเพิ่มเติม');
    expect(render()).not.toContain('ดูเพิ่มเติม');
  });

  it('uses business language instead of technical jargon', () => {
    const html = render();
    for (const jargon of ['JSON', 'payload', 'endpoint', 'form_id']) {
      expect(html).not.toContain(jargon);
    }
  });

  it('labels the language of each form when the site offers several', () => {
    const html = render({ locales: ['th', 'en'] });

    expect(html).toContain('ไทย');
    expect(html).toContain('แปลเป็นภาษาอื่น');
  });

  it('hides the language column for a single-language site', () => {
    const html = render({ locales: ['th'] });

    expect(html).not.toContain('forms-item__lang');
    expect(html).not.toContain('แปลเป็นภาษาอื่น');
  });

  it('marks a form that is shared by every language', () => {
    const html = render({
      locales: ['th', 'en'],
      controller: controller({ summaries: [summary({ locale: null })] }),
    });

    expect(html).toContain('ใช้ร่วมทุกภาษา');
  });
});
