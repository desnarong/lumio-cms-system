import { z } from 'zod';
import { ROLES } from './rbac.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('อีเมลไม่ถูกต้อง')
  .max(255, 'อีเมลยาวเกินไป');

export const passwordSchema = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(200, 'รหัสผ่านยาวเกินไป');

export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(120).optional(),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(200),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const membershipSchema = z.object({
  siteId: z.string().uuid(),
  role: z.enum(ROLES),
});
export type Membership = z.infer<typeof membershipSchema>;

export const sessionSchema = z.object({
  user: authUserSchema,
  memberships: z.array(membershipSchema),
});
export type Session = z.infer<typeof sessionSchema>;

/** Six digits from an authenticator app (docs/design/15-security.md). */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'รหัสจากแอปยืนยันตัวตนต้องมี 6 หลัก');

/** A TOTP code, or one of the XXXX-XXXX recovery codes for a lost phone. */
export const twoFactorCodeSchema = z
  .string()
  .trim()
  .regex(/^(\d{6}|[A-Za-z2-7]{4}-?[A-Za-z2-7]{4})$/, 'รหัสไม่ถูกต้อง');

/** Sent after the password step when the account has 2FA enabled. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  /** Short-lived ticket that may only be exchanged for a session with a code. */
  challengeToken: string;
}

export type SignInResponse =
  | TwoFactorChallenge
  | { twoFactorRequired?: false; user: AuthUser; accessToken: string };

export const isTwoFactorChallenge = (value: SignInResponse): value is TwoFactorChallenge =>
  'challengeToken' in value;

export const verifyTwoFactorInputSchema = z.object({
  challengeToken: z.string().min(20).max(4_000),
  code: twoFactorCodeSchema,
});
export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorInputSchema>;

/** Secret + otpauth URI shown once, so the owner can add the account to an app. */
export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
}

export const enableTwoFactorInputSchema = z.object({ code: totpCodeSchema });
export type EnableTwoFactorInput = z.infer<typeof enableTwoFactorInputSchema>;

export const disableTwoFactorInputSchema = z.object({
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(200),
  code: twoFactorCodeSchema,
});
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorInputSchema>;

/** One-time codes for a lost phone; shown once when 2FA is enabled. */
export interface TwoFactorEnabled {
  recoveryCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  recoveryCodesLeft: number;
}

