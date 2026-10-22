import { z } from 'zod';
import type { AppPermission } from './app.js';

/**
 * The postMessage contract between a sandboxed App and the Lumio bridge
 * (docs/design/16-apps.md 16.4). An App may only call the methods listed here,
 * and each one maps to the single permission scope it needs, so the bridge can
 * refuse a call the owner never granted.
 */

export const APP_BRIDGE_METHODS = [
  'contents.list',
  'forms.list',
  'media.list',
  'analytics.summary',
] as const;
export type AppBridgeMethod = (typeof APP_BRIDGE_METHODS)[number];

export const APP_BRIDGE_METHOD_LABELS: Record<AppBridgeMethod, string> = {
  'contents.list': 'อ่านรายการหน้าเว็บและบทความ',
  'forms.list': 'อ่านข้อความจากฟอร์ม',
  'media.list': 'อ่านรายการไฟล์สื่อ',
  'analytics.summary': 'อ่านสถิติผู้เข้าชม',
};

/** Which scope an App must have been granted to call each method. */
export const APP_BRIDGE_METHOD_SCOPES: Record<AppBridgeMethod, AppPermission> = {
  'contents.list': 'contents:read',
  'forms.list': 'forms:read',
  'media.list': 'media:read',
  'analytics.summary': 'analytics:read',
};

export const isAppBridgeMethod = (value: unknown): value is AppBridgeMethod =>
  typeof value === 'string' && (APP_BRIDGE_METHODS as readonly string[]).includes(value);

export const requiredScopeFor = (method: string): AppPermission | null =>
  isAppBridgeMethod(method) ? APP_BRIDGE_METHOD_SCOPES[method] : null;

export const appBridgeRequestSchema = z.object({
  id: z.string().min(1).max(80),
  method: z.string().min(1).max(60),
  params: z.record(z.unknown()).optional(),
});
export type AppBridgeRequest = z.infer<typeof appBridgeRequestSchema>;

export const appBridgeResponseSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});
export type AppBridgeResponse = z.infer<typeof appBridgeResponseSchema>;

/** A short list result the bridge hands back to an App. */
export const appBridgeListResultSchema = z.object({
  items: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type AppBridgeListResult = z.infer<typeof appBridgeListResultSchema>;
