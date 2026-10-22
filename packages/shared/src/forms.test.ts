import { describe, expect, it } from 'vitest';
import {
  createFormInputSchema,
  DEFAULT_CONTACT_FORM_FIELDS,
  formFieldsSchema,
  isHoneypotFilled,
  submitFormInputSchema,
  validateFormSubmission,
  type FormField,
} from './forms.js';

const field = (overrides: Partial<FormField>): FormField => ({
  id: 'fld_1',
  name: 'field',
  label: 'ช่อง',
  type: 'text',
  required: false,
  options: [],
  ...overrides,
});

describe('form fields', () => {
  it('rejects a form without any field', () => {
    expect(formFieldsSchema.safeParse([]).success).toBe(false);
  });

  it('rejects duplicate field names', () => {
    const result = formFieldsSchema.safeParse([
      field({ id: 'a', name: 'name' }),
      field({ id: 'b', name: 'name' }),
    ]);
    expect(result.success).toBe(false);
  });

  it('requires at least one option for a select field', () => {
    expect(formFieldsSchema.safeParse([field({ type: 'select', options: [] })]).success).toBe(false);
    expect(
      formFieldsSchema.safeParse([field({ type: 'select', options: ['ก', 'ข'] })]).success,
    ).toBe(true);
  });

  it('rejects a machine name that is not a-z/0-9/_', () => {
    expect(formFieldsSchema.safeParse([field({ name: 'ชื่อ-ไทย' })]).success).toBe(false);
    expect(formFieldsSchema.safeParse([field({ name: 'full_name2' })]).success).toBe(true);
  });
});

describe('createFormInputSchema', () => {
  it('applies the default success message and empty notify settings', () => {
    const parsed = createFormInputSchema.parse({
      name: 'ติดต่อเรา',
      fields: DEFAULT_CONTACT_FORM_FIELDS,
    });
    expect(parsed.successMessage.length).toBeGreaterThan(0);
    expect(parsed.notify).toEqual({ emails: [] });
  });

  it('rejects an invalid notification email', () => {
    const result = createFormInputSchema.safeParse({
      name: 'ติดต่อเรา',
      fields: DEFAULT_CONTACT_FORM_FIELDS,
      notify: { emails: ['not-an-email'] },
    });
    expect(result.success).toBe(false);
  });
});

describe('validateFormSubmission', () => {
  const fields: FormField[] = [
    field({ id: 'a', name: 'name', label: 'ชื่อ', required: true }),
    field({ id: 'b', name: 'email', label: 'อีเมล', type: 'email', required: true }),
    field({ id: 'c', name: 'phone', label: 'เบอร์โทร', type: 'tel' }),
    field({ id: 'd', name: 'topic', label: 'หัวข้อ', type: 'select', options: ['ขาย', 'ซ่อม'] }),
    field({ id: 'e', name: 'consent', label: 'เงื่อนไข', type: 'checkbox', required: true }),
    field({ id: 'f', name: 'seats', label: 'จำนวน', type: 'number' }),
  ];

  it('accepts a complete set of answers and trims them', () => {
    const result = validateFormSubmission(fields, {
      name: '  สมชาย ',
      email: 'somchai@example.com',
      phone: '081-234-5678',
      topic: 'ขาย',
      consent: 'on',
      seats: '2',
    });
    expect(result).toEqual({
      ok: true,
      data: {
        name: 'สมชาย',
        email: 'somchai@example.com',
        phone: '081-234-5678',
        topic: 'ขาย',
        consent: 'true',
        seats: '2',
      },
    });
  });

  it('reports every missing required answer in Thai', () => {
    const result = validateFormSubmission(fields, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(['name', 'email', 'consent']);
    expect(result.errors[0]?.message).toContain('ชื่อ');
  });

  it('rejects a malformed email, phone and number', () => {
    const result = validateFormSubmission(fields, {
      name: 'สมชาย',
      email: 'nope',
      phone: 'abc',
      consent: true,
      seats: 'มาก',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(['email', 'phone', 'seats']);
  });

  it('rejects a select value that is not one of the options', () => {
    const result = validateFormSubmission(fields, {
      name: 'สมชาย',
      email: 'a@b.com',
      consent: true,
      topic: 'ปลอม',
    });
    expect(result.ok).toBe(false);
  });

  it('allows an optional field to be left blank', () => {
    const result = validateFormSubmission(fields, {
      name: 'สมชาย',
      email: 'a@b.com',
      consent: true,
    });
    expect(result).toEqual({
      ok: true,
      data: { name: 'สมชาย', email: 'a@b.com', consent: 'true', phone: '', seats: '', topic: '' },
    });
  });
});

describe('spam controls', () => {
  it('treats any honeypot content as spam', () => {
    expect(isHoneypotFilled('bot')).toBe(true);
    expect(isHoneypotFilled('   ')).toBe(false);
    expect(isHoneypotFilled(undefined)).toBe(false);
  });

  it('accepts an empty submit body', () => {
    expect(submitFormInputSchema.parse({})).toEqual({ data: {} });
  });
});
