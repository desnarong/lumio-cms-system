import { z } from 'zod';
import { PERMISSION_SCOPES } from './permissions.js';

export const appBlockSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
});

export const appAdminPageSchema = z.object({
  title: z.string().min(1),
  entry: z.string().min(1),
});

export const appManifestSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'key ต้องเป็น a-z, 0-9 และขีดกลาง'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version ต้องเป็น semver'),
  permissions: z.array(z.enum(PERMISSION_SCOPES)).default([]),
  blocks: z.array(z.string().min(1)).default([]),
  adminPages: z.array(appAdminPageSchema).default([]),
  settingsSchema: z.record(z.unknown()).optional(),
  /** Shown in the Lumio store before the owner installs the App (16-apps.md). */
  description: z.string().min(1).optional(),
  category: z.enum(['marketing', 'communication', 'analytics', 'content']).optional(),
  /** Hosted admin page the Lumio sandbox loads; resolved against the manifest URL. */
  entry: z.string().min(1).optional(),
  iconUrl: z.string().min(1).optional(),
});

export type AppManifest = z.infer<typeof appManifestSchema>;

/** Validates a manifest at build time so Apps can only declare known scopes. */
export const defineApp = (manifest: AppManifest): AppManifest => appManifestSchema.parse(manifest);
