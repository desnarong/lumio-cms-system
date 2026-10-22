import { z } from 'zod';

/**
 * Redirect manager (docs/design/14-seo-performance.md 14.1). A rule points an old
 * address at the page that replaced it, so moving or renaming a page never sends
 * visitors to a 404. The public renderer follows the rule only when no page
 * matches the address, so a redirect can never shadow real content.
 */

export const REDIRECT_CODES = [301, 302] as const;
export type RedirectCode = (typeof REDIRECT_CODES)[number];

export const isRedirectCode = (value: unknown): value is RedirectCode =>
  value === 301 || value === 302;

/** `old-page` and `/old-page/` both address the same page as `/old-page`. */
export const normalizeRedirectPath = (raw: string): string => {
  const trimmed = raw.trim();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = withSlash.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : '/';
};

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const hasForbiddenCharacters = (value: string): boolean => /[\s?#\\]/.test(value);

const fromPathSchema = z
  .string()
  .trim()
  .min(1, 'กรอกที่อยู่เดิมด้วย')
  .max(500)
  .superRefine((value, ctx) => {
    if (isAbsoluteUrl(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ที่อยู่เดิมต้องเป็นที่อยู่ภายในเว็บ' });
      return;
    }
    if (hasForbiddenCharacters(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ที่อยู่เดิมใช้ได้เฉพาะตัวอักษร ไม่มีช่องว่าง ? # หรือ \\',
      });
      return;
    }
    if (normalizeRedirectPath(value) === '/') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ส่งหน้าแรกไปที่อื่นไม่ได้' });
    }
  });

const toPathSchema = z
  .string()
  .trim()
  .min(1, 'กรอกที่อยู่ปลายทางด้วย')
  .max(500)
  .superRefine((value, ctx) => {
    if (isAbsoluteUrl(value)) {
      try {
        void new URL(value);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ที่อยู่ปลายทางไม่ถูกต้อง' });
      }
      return;
    }
    if (hasForbiddenCharacters(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ที่อยู่ปลายทางใช้ได้เฉพาะตัวอักษร ไม่มีช่องว่าง ? # หรือ \\',
      });
    }
  });

const normalizeTarget = (value: string): string =>
  isAbsoluteUrl(value) ? value : normalizeRedirectPath(value);

const normalizeInput = <T extends { fromPath: string; toPath: string }>(input: T): T => ({
  ...input,
  fromPath: normalizeRedirectPath(input.fromPath),
  toPath: normalizeTarget(input.toPath),
});

export const createRedirectInputSchema = z
  .object({
    fromPath: fromPathSchema,
    toPath: toPathSchema,
    code: z.union([z.literal(301), z.literal(302)]).default(301),
  })
  .transform(normalizeInput)
  .refine((input) => input.fromPath !== input.toPath, {
    message: 'ที่อยู่ปลายทางต้องต่างจากที่อยู่เดิม',
    path: ['toPath'],
  });
export type CreateRedirectInput = z.infer<typeof createRedirectInputSchema>;

/** `fromPath` identifies the rule, so editing keeps the old address in place. */
export const updateRedirectInputSchema = createRedirectInputSchema;
export type UpdateRedirectInput = z.infer<typeof updateRedirectInputSchema>;

export const redirectRuleSchema = z.object({
  fromPath: z.string(),
  toPath: z.string(),
  code: z.union([z.literal(301), z.literal(302)]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RedirectRule = z.infer<typeof redirectRuleSchema>;

export const redirectListSchema = z.object({
  items: z.array(redirectRuleSchema),
});
export type RedirectList = z.infer<typeof redirectListSchema>;
