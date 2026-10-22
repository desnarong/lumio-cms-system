import { z } from 'zod';
import { localeSchema } from './locale.js';
import { paginationQuerySchema } from './site.js';

/**
 * Contact forms and the messages they collect (docs/design/11-data-model.md,
 * docs/design/12-api.md 12.1). A form owns its field list, so the same schema
 * validates what the editor builds, what the API stores, and what a visitor
 * submits.
 */

export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'tel',
  'textarea',
  'select',
  'checkbox',
  'number',
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/** Machine name of a field; it becomes the key of the submitted payload. */
export const FORM_FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export const FORM_MAX_FIELDS = 20;
export const FORM_MAX_OPTIONS = 30;

export const DEFAULT_FORM_SUCCESS_MESSAGE = 'ได้รับข้อความแล้ว ขอบคุณที่ติดต่อเรา';

/** Hidden field a bot fills in but a person never sees (docs/design/15-security.md). */
export const FORM_HONEYPOT_FIELD = '_hp';

const fieldOptionSchema = z.string().trim().min(1).max(80);

export const formFieldSchema = z
  .object({
    /** Stable id so the editor can reorder fields without losing React keys. */
    id: z.string().min(1).max(60),
    name: z
      .string()
      .regex(FORM_FIELD_NAME_PATTERN, 'ชื่อฟิลด์ใช้ได้เฉพาะ a-z, 0-9 และ _ (เริ่มด้วยตัวอักษร)'),
    label: z.string().trim().min(1, 'กรุณากรอกชื่อช่อง').max(120),
    type: z.enum(FORM_FIELD_TYPES),
    required: z.boolean().default(false),
    placeholder: z.string().trim().max(120).optional(),
    helpText: z.string().trim().max(200).optional(),
    /** Choices for `select`; other types ignore it. */
    options: z.array(fieldOptionSchema).max(FORM_MAX_OPTIONS).default([]),
  })
  .superRefine((field, ctx) => {
    if (field.type === 'select' && field.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'ช่องแบบเลือกได้ต้องมีตัวเลือกอย่างน้อยหนึ่งรายการ',
      });
    }
  });
export type FormField = z.infer<typeof formFieldSchema>;

export const formFieldsSchema = z
  .array(formFieldSchema)
  .min(1, 'ฟอร์มต้องมีอย่างน้อยหนึ่งช่อง')
  .max(FORM_MAX_FIELDS, `ฟอร์มหนึ่งมีได้ไม่เกิน ${FORM_MAX_FIELDS} ช่อง`)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((field, index) => {
      if (seen.has(field.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'name'],
          message: 'ชื่อฟิลด์ซ้ำกัน',
        });
      }
      seen.add(field.name);
    });
  });

export const formNotifySchema = z.object({
  /** Where a new message is announced; empty means "only the inbox". */
  emails: z.array(z.string().trim().email('อีเมลไม่ถูกต้อง')).max(5).default([]),
  /** LINE Notify token; when present the message is also pushed to LINE. */
  lineToken: z.string().trim().max(200).optional(),
});
export type FormNotify = z.infer<typeof formNotifySchema>;

export const createFormInputSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาตั้งชื่อฟอร์ม').max(120),
  fields: formFieldsSchema,
  notify: formNotifySchema.default({}),
  successMessage: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .default(DEFAULT_FORM_SUCCESS_MESSAGE),
  /**
   * Language this form is written in (docs/design/17-i18n.md 17.5). Omitted
   * means "every language": `null` in the database, which is how forms created
   * before multi-language sites keep working unchanged.
   */
  locale: localeSchema.optional(),
});
export type CreateFormInput = z.infer<typeof createFormInputSchema>;

export const updateFormInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  fields: formFieldsSchema.optional(),
  notify: formNotifySchema.optional(),
  successMessage: z.string().trim().min(1).max(300).optional(),
  locale: localeSchema.nullable().optional(),
});
export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;

/**
 * Adds a language to an existing form: the fields are copied so the labels can
 * be translated, and both rows are linked through one translation group
 * (docs/design/17-i18n.md 17.5 step 3).
 */
export const copyFormToLocaleInputSchema = z.object({
  locale: localeSchema,
  name: z.string().trim().min(1).max(120).optional(),
});
export type CopyFormToLocaleInput = z.infer<typeof copyFormToLocaleInputSchema>;

/** The full form, as the editor reads it. */
export interface Form {
  id: string;
  name: string;
  fields: FormField[];
  notify: FormNotify;
  successMessage: string;
  /** Language of the labels, or `null` when the form serves every language. */
  locale: string | null;
  /** Group shared by the languages of one form. */
  translationGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One row of the forms list, with the counters the inbox shows. */
export interface FormSummary {
  id: string;
  name: string;
  fieldCount: number;
  submissionCount: number;
  newCount: number;
  locale: string | null;
  translationGroupId: string | null;
  updatedAt: string;
}

/** What a public page needs to render the form; never carries notify settings. */
export const publicFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: formFieldsSchema,
  successMessage: z.string(),
});
export type PublicForm = z.infer<typeof publicFormSchema>;

export const FORM_SUBMISSION_STATUSES = ['new', 'read', 'archived'] as const;
export type FormSubmissionStatus = (typeof FORM_SUBMISSION_STATUSES)[number];

export const isFormSubmissionStatus = (value: unknown): value is FormSubmissionStatus =>
  typeof value === 'string' && (FORM_SUBMISSION_STATUSES as readonly string[]).includes(value);

export const FORM_SUBMISSION_STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  new: 'ใหม่',
  read: 'อ่านแล้ว',
  archived: 'เก็บเข้าคลัง',
};

export interface FormSubmission {
  id: string;
  formId: string;
  /** Answers keyed by field name; values are always strings. */
  data: Record<string, string>;
  status: FormSubmissionStatus;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
}

export const submissionListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(FORM_SUBMISSION_STATUSES).optional(),
});
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;

export const updateSubmissionInputSchema = z.object({
  status: z.enum(FORM_SUBMISSION_STATUSES),
});
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionInputSchema>;

/** Body of `POST /public/:host/forms/:id/submit`; the honeypot must stay empty. */
export const submitFormInputSchema = z.object({
  data: z.record(z.unknown()).default({}),
  honeypot: z.string().max(200).optional(),
});
export type SubmitFormInput = z.infer<typeof submitFormInputSchema>;

export interface FormValidationError {
  field: string;
  message: string;
}

export type FormValidationResult =
  | { ok: true; data: Record<string, string> }
  | { ok: false; errors: FormValidationError[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_PATTERN = /^[+()\-\s0-9]{6,20}$/;

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const asChecked = (value: unknown): boolean =>
  value === true || value === 'true' || value === 'on' || value === '1';

/**
 * Validates a visitor's answers against the form definition. The API is the
 * source of truth, so the same function also powers the editor's preview.
 */
export const validateFormSubmission = (
  fields: readonly FormField[],
  input: Record<string, unknown>,
): FormValidationResult => {
  const errors: FormValidationError[] = [];
  const data: Record<string, string> = {};

  for (const field of fields) {
    const raw = input[field.name];

    if (field.type === 'checkbox') {
      const checked = asChecked(raw);
      if (field.required && !checked) {
        errors.push({ field: field.name, message: `กรุณายืนยัน${field.label}` });
        continue;
      }
      data[field.name] = checked ? 'true' : 'false';
      continue;
    }

    const value = asText(raw);

    if (value.length === 0) {
      if (field.required) {
        errors.push({
          field: field.name,
          message: field.type === 'select' ? `กรุณาเลือก${field.label}` : `กรุณากรอก${field.label}`,
        });
      } else {
        data[field.name] = '';
      }
      continue;
    }

    if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
      errors.push({ field: field.name, message: 'อีเมลไม่ถูกต้อง' });
      continue;
    }

    if (field.type === 'tel' && !TEL_PATTERN.test(value)) {
      errors.push({ field: field.name, message: 'เบอร์โทรไม่ถูกต้อง' });
      continue;
    }

    if (field.type === 'number' && !Number.isFinite(Number(value))) {
      errors.push({ field: field.name, message: `${field.label}ต้องเป็นตัวเลข` });
      continue;
    }

    if (field.type === 'select' && !field.options.includes(value)) {
      errors.push({ field: field.name, message: `กรุณาเลือก${field.label}จากตัวเลือก` });
      continue;
    }

    data[field.name] = value;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, data };
};

/** A filled honeypot means a bot, not a person. */
export const isHoneypotFilled = (value: unknown): boolean => asText(value).length > 0;

/** The default contact form every new site can start from. */
export const DEFAULT_CONTACT_FORM_FIELDS: FormField[] = [
  {
    id: 'fld_name',
    name: 'name',
    label: 'ชื่อของคุณ',
    type: 'text',
    required: true,
    placeholder: 'เช่น สมชาย ใจดี',
    options: [],
  },
  {
    id: 'fld_email',
    name: 'email',
    label: 'อีเมล',
    type: 'email',
    required: true,
    placeholder: 'you@example.com',
    options: [],
  },
  {
    id: 'fld_phone',
    name: 'phone',
    label: 'เบอร์โทร (ไม่บังคับ)',
    type: 'tel',
    required: false,
    placeholder: '08x-xxx-xxxx',
    options: [],
  },
  {
    id: 'fld_message',
    name: 'message',
    label: 'ข้อความ',
    type: 'textarea',
    required: true,
    placeholder: 'เล่าให้เราฟังว่าคุณต้องการอะไร',
    options: [],
  },
];
