export const PERMISSION_SCOPES = [
  'contents:read',
  'contents:write:own',
  'forms:read',
  'email:send',
  'media:read',
  'media:write',
  'analytics:read',
] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const hasScope = (
  granted: readonly PermissionScope[],
  required: PermissionScope,
): boolean => granted.includes(required);
