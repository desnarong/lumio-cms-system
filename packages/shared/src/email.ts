import { z } from 'zod';
import { isPrivateHostname } from './app-manifest.js';

/**
 * Site email settings (docs/design/03-scope.md "ฟอร์มติดต่อ + แจ้งเตือน
 * Email", 05-admin-ia.md). A site owner connects their own mailbox, so contact
 * form messages really reach the team without the platform operator reading
 * them. Two providers cover almost every Thai hosting plan:
 *
 * - `smtp` — any mailbox (cPanel, Google Workspace, Zoho, ...).
 * - `resend` — an API key for owners who have no SMTP mailbox.
 *
 * Secrets live encrypted inside `sites.settings.email` (see `secret-box.ts`);
 * they are never returned by the API, only a `hasPassword` / `hasApiKey` flag.
 */

export const EMAIL_PROVIDERS = ['smtp', 'resend'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export const isEmailProvider = (value: unknown): value is EmailProvider =>
  typeof value === 'string' && (EMAIL_PROVIDERS as readonly string[]).includes(value);

/** Header-injection guard: a name or address may never carry a line break. */
const singleLine = (value: string): boolean => !/[\r\n]/.test(value);

const fromEmailSchema = z
  .string()
  .trim()
  .min(1, 'กรอกอีเมลผู้ส่งด้วย')
  .email('อีเมลผู้ส่งไม่ถูกต้อง')
  .max(200);

const fromNameSchema = z
  .string()
  .trim()
  .max(80, 'ชื่อผู้ส่งยาวเกินไป')
  .refine(singleLine, 'ชื่อผู้ส่งมีอักขระที่ใช้ไม่ได้')
  .default('');

/** A mail server name: `smtp.example.com`, `mail.บริษัท.co.th` is not supported. */
const smtpHostSchema = z
  .string()
  .trim()
  .min(1, 'กรอกที่อยู่เซิร์ฟเวอร์อีเมลด้วย')
  .max(253)
  .refine((value) => !/[\s/@\\?#]/.test(value), 'ที่อยู่เซิร์ฟเวอร์อีเมลไม่ถูกต้อง')
  .refine((value) => !/^https?:\/\//i.test(value), 'กรอกเฉพาะชื่อเซิร์ฟเวอร์ ไม่ต้องมี https://')
  .refine(singleLine, 'ที่อยู่เซิร์ฟเวอร์อีเมลไม่ถูกต้อง')
  .refine(
    (value) => !isPrivateHostname(value),
    'เซิร์ฟเวอร์อีเมลต้องเป็นที่อยู่บนอินเทอร์เน็ต ไม่ใช่เครือข่ายภายใน',
  );

export const smtpSettingsInputSchema = z.object({
  host: smtpHostSchema,
  port: z.coerce.number().int().min(1).max(65_535).default(465),
  /** `true` = TLS from the first byte (port 465); `false` = STARTTLS (port 587). */
  secure: z.boolean().default(true),
  username: z
    .string()
    .trim()
    .max(200)
    .refine(singleLine, 'ชื่อผู้ใช้มีอักขระที่ใช้ไม่ได้')
    .default(''),
  /** Omitted on later saves means "keep the stored password". */
  password: z.string().max(500).optional(),
  clearPassword: z.boolean().optional(),
});
export type SmtpSettingsInput = z.infer<typeof smtpSettingsInputSchema>;

export const resendSettingsInputSchema = z.object({
  /** Omitted on later saves means "keep the stored key". */
  apiKey: z.string().max(300).optional(),
  clearApiKey: z.boolean().optional(),
});
export type ResendSettingsInput = z.infer<typeof resendSettingsInputSchema>;

/** What the owner fills in on ตั้งค่า › อีเมล. */
export const emailSettingsInputSchema = z
  .object({
    enabled: z.boolean().default(true),
    provider: z.enum(EMAIL_PROVIDERS),
    fromName: fromNameSchema,
    fromEmail: fromEmailSchema,
    /** Default recipients for contact forms that do not name their own. */
    notifyEmails: z
      .array(z.string().trim().email('อีเมลผู้รับไม่ถูกต้อง'))
      .max(5, 'ใส่ได้ไม่เกิน 5 อีเมล')
      .default([]),
    smtp: smtpSettingsInputSchema.optional(),
    resend: resendSettingsInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.provider === 'smtp' && !value.smtp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['smtp'],
        message: 'กรอกรายละเอียดเซิร์ฟเวอร์อีเมลด้วย',
      });
    }
    if (value.provider === 'resend' && value.resend === undefined) {
      // A site may switch back to Resend after saving the key earlier; the
      // service decides whether a usable key exists.
      return;
    }
  });
export type EmailSettingsInput = z.infer<typeof emailSettingsInputSchema>;

/** What the API returns: secrets are replaced by presence flags. */
export const emailSettingsViewSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(EMAIL_PROVIDERS),
  fromName: z.string(),
  fromEmail: z.string(),
  notifyEmails: z.array(z.string()),
  smtp: z.object({
    host: z.string(),
    port: z.number().int(),
    secure: z.boolean(),
    username: z.string(),
    hasPassword: z.boolean(),
  }),
  resend: z.object({ hasApiKey: z.boolean() }),
  /** The deployment has a platform-wide mail key that can act as a fallback. */
  platformReady: z.boolean(),
  /** True when this site can actually send today (enabled + credentials). */
  ready: z.boolean(),
  updatedAt: z.string().nullable(),
});
export type EmailSettingsView = z.infer<typeof emailSettingsViewSchema>;

/** The encrypted shape stored in `sites.settings.email`. */
export const storedEmailSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(EMAIL_PROVIDERS),
  fromName: z.string(),
  fromEmail: z.string(),
  notifyEmails: z.array(z.string()),
  smtp: z
    .object({
      host: z.string(),
      port: z.number().int(),
      secure: z.boolean(),
      username: z.string(),
      /** `enc:v1:...`, never a plain password. */
      password: z.string().optional(),
    })
    .optional(),
  resend: z.object({ apiKey: z.string().optional() }).optional(),
  updatedAt: z.string(),
});
export type StoredEmailSettings = z.infer<typeof storedEmailSettingsSchema>;

/** Reads `sites.settings.email` defensively; a broken blob means "not set up". */
export const readStoredEmailSettings = (settings: unknown): StoredEmailSettings | null => {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const candidate = (settings as Record<string, unknown>).email;
  const parsed = storedEmailSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

/** Defaults the form shows before anything is saved. */
export const emptyEmailSettings = (): EmailSettingsInput => ({
  enabled: true,
  provider: 'smtp',
  fromName: '',
  fromEmail: '',
  notifyEmails: [],
  smtp: { host: '', port: 465, secure: true, username: '' },
  resend: {},
});

/** One-line reason a saved setup still cannot send, or `null` when it can. */
export const emailSetupProblem = (
  input: Pick<EmailSettingsInput, 'provider' | 'smtp' | 'resend'>,
  hasPassword: boolean,
  hasApiKey: boolean,
): string | null => {
  if (input.provider === 'smtp') {
    if (!input.smtp || input.smtp.host.trim().length === 0) return 'ยังไม่ได้กรอกเซิร์ฟเวอร์อีเมล';
    if (!hasPassword) return 'ยังไม่ได้กรอกรหัสผ่านอีเมล';
    return null;
  }
  if (!hasApiKey) return 'ยังไม่ได้กรอกคีย์ Resend';
  return null;
};

export const emailTestInputSchema = z.object({
  to: z.string().trim().email('อีเมลทดสอบไม่ถูกต้อง'),
});
export type EmailTestInput = z.infer<typeof emailTestInputSchema>;

export const emailTestResultSchema = z.object({
  sent: z.boolean(),
  message: z.string(),
});
export type EmailTestResult = z.infer<typeof emailTestResultSchema>;
