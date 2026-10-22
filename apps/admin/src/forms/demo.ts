import { translateNow } from '@lumio/ui';
import {
  DEFAULT_CONTACT_FORM_FIELDS,
  type Form,
  type FormSubmission,
  type FormSummary,
} from '@lumio/shared';
import { ApiError } from '../api-error.js';
import type { FormsApi, SubmissionPage, SubmissionQuery } from './api.js';

let counter = 0;

const nextId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

const contactForm = (): Form => ({
  id: '00000000-0000-4000-8000-0000000000f1',
  name: 'ติดต่อเรา',
  fields: DEFAULT_CONTACT_FORM_FIELDS,
  notify: { emails: ['owner@baandoi.lumio.app'] },
  successMessage: 'ได้รับข้อความแล้ว ขอบคุณที่ติดต่อเรา',
  // The demo site offers Thai and English, so the contact form starts in Thai.
  locale: 'th',
  translationGroupId: '00000000-0000-4000-8000-0000000000f1',
  createdAt: '2026-10-01T03:00:00.000Z',
  updatedAt: '2026-10-20T03:00:00.000Z',
});

const quoteForm = (): Form => ({
  id: '00000000-0000-4000-8000-0000000000f2',
  name: 'ขอใบเสนอราคา',
  fields: [
    {
      id: 'fld_company',
      name: 'company',
      label: 'ชื่อร้านหรือบริษัท',
      type: 'text',
      required: true,
      options: [],
    },
    {
      id: 'fld_volume',
      name: 'volume',
      label: 'ปริมาณที่ต้องการต่อเดือน',
      type: 'select',
      required: true,
      options: ['1-5 กก.', '6-20 กก.', 'มากกว่า 20 กก.'],
    },
    {
      id: 'fld_note',
      name: 'note',
      label: 'รายละเอียดเพิ่มเติม',
      type: 'textarea',
      required: false,
      options: [],
    },
  ],
  notify: { emails: [] },
  successMessage: 'ได้รับคำขอแล้ว ทีมงานจะส่งใบเสนอราคาให้ภายใน 1 วันทำการ',
  locale: null,
  translationGroupId: null,
  createdAt: '2026-10-05T03:00:00.000Z',
  updatedAt: '2026-10-18T03:00:00.000Z',
});

const demoSubmissions = (): FormSubmission[] => [
  {
    id: '00000000-0000-4000-8000-000000000101',
    formId: '00000000-0000-4000-8000-0000000000f1',
    data: {
      name: 'สมชาย ใจดี',
      email: 'somchai@example.com',
      phone: '081-234-5678',
      message: 'อยากสั่งเมล็ดกาแฟคั่วกลาง 2 กิโลกรัมครับ',
    },
    status: 'new',
    createdAt: '2026-10-24T01:20:00.000Z',
    ip: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (iPhone)',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    formId: '00000000-0000-4000-8000-0000000000f1',
    data: {
      name: 'ณัฐพร สุขใจ',
      email: 'nattaporn@example.com',
      phone: '',
      message: 'ร้านเปิดกี่โมงคะ อยากแวะไปชิม',
    },
    status: 'read',
    createdAt: '2026-10-23T09:05:00.000Z',
    ip: '203.0.113.22',
    userAgent: 'Mozilla/5.0 (Android)',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    formId: '00000000-0000-4000-8000-0000000000f2',
    data: { company: 'คาเฟ่ริมน้ำ', volume: '6-20 กก.', note: 'ขอราคาส่งรายเดือน' },
    status: 'new',
    createdAt: '2026-10-24T02:40:00.000Z',
    ip: '198.51.100.7',
    userAgent: 'Mozilla/5.0 (Macintosh)',
  },
];

/**
 * In-memory forms API so the screen works before the backend is wired
 * (`VITE_API_URL` empty). Counters, undo and pagination behave like the real one.
 */
export const createDemoFormsApi = (): FormsApi => {
  let forms: Form[] = [contactForm(), quoteForm()];
  let submissions: FormSubmission[] = demoSubmissions();

  const summaryOf = (form: Form): FormSummary => {
    const mine = submissions.filter((entry) => entry.formId === form.id);
    return {
      id: form.id,
      name: form.name,
      fieldCount: form.fields.length,
      submissionCount: mine.length,
      newCount: mine.filter((entry) => entry.status === 'new').length,
      locale: form.locale,
      translationGroupId: form.translationGroupId,
      updatedAt: form.updatedAt,
    };
  };

  const requireForm = (formId: string): Form => {
    const form = forms.find((entry) => entry.id === formId);
    if (!form) throw new ApiError('not_found', translateNow('demo.formNotFound'), 404);
    return form;
  };

  return {
    list: async () => forms.map(summaryOf),

    get: async (formId) => requireForm(formId),

    create: async (input) => {
      const now = new Date().toISOString();
      const form: Form = {
        id: nextId(),
        name: input.name,
        fields: input.fields,
        notify: input.notify,
        successMessage: input.successMessage,
        locale: input.locale ?? null,
        translationGroupId: null,
        createdAt: now,
        updatedAt: now,
      };
      if (form.locale) form.translationGroupId = form.id;
      forms = [form, ...forms];
      return form;
    },

    copyToLocale: async (formId, input) => {
      const source = requireForm(formId);
      const locale = input.locale.trim().toLowerCase();
      const groupId = source.translationGroupId ?? source.id;
      if (forms.some((entry) => entry.translationGroupId === groupId && entry.locale === locale)) {
        throw new ApiError('conflict', translateNow('demo.formLanguageExists'), 409);
      }

      const now = new Date().toISOString();
      const copy: Form = {
        ...source,
        id: nextId(),
        name: input.name ?? source.name,
        locale,
        translationGroupId: groupId,
        createdAt: now,
        updatedAt: now,
      };
      source.translationGroupId = groupId;
      forms = [copy, ...forms];
      return copy;
    },

    update: async (formId, input) => {
      const current = requireForm(formId);
      const updated: Form = {
        ...current,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.fields === undefined ? {} : { fields: input.fields }),
        ...(input.notify === undefined ? {} : { notify: input.notify }),
        ...(input.successMessage === undefined ? {} : { successMessage: input.successMessage }),
        updatedAt: new Date().toISOString(),
      };
      forms = forms.map((entry) => (entry.id === formId ? updated : entry));
      return updated;
    },

    remove: async (formId) => {
      requireForm(formId);
      forms = forms.filter((entry) => entry.id !== formId);
      submissions = submissions.filter((entry) => entry.formId !== formId);
    },

    listSubmissions: async (formId, query: SubmissionQuery = {}): Promise<SubmissionPage> => {
      requireForm(formId);
      const limit = query.limit ?? 20;
      const filtered = submissions
        .filter((entry) => entry.formId === formId)
        .filter((entry) => (query.status ? entry.status === query.status : true))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      const start = query.cursor
        ? filtered.findIndex((entry) => entry.id === query.cursor) + 1
        : 0;
      const items = filtered.slice(start, start + limit);
      const next = start + limit < filtered.length ? (items.at(-1)?.id ?? null) : null;
      return { items, cursor: next };
    },

    updateSubmission: async (formId, submissionId, input) => {
      requireForm(formId);
      const current = submissions.find((entry) => entry.id === submissionId);
      if (!current) throw new ApiError('not_found', translateNow('demo.messageNotFound'), 404);

      const updated: FormSubmission = { ...current, status: input.status };
      submissions = submissions.map((entry) => (entry.id === submissionId ? updated : entry));
      return updated;
    },
  };
};
