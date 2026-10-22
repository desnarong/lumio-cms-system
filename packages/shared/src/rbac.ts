export const ROLES = ['owner', 'admin', 'editor', 'author', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  'billing.manage',
  'site.settings',
  'team.manage',
  'design.update',
  'content.publish',
  'content.write',
  'form.read',
  'site.view',
] as const;

export type Action = (typeof ACTIONS)[number];

/** Permission matrix from docs/design/13-rbac.md — UI hides, API enforces. */
export const PERMISSIONS: Record<Action, readonly Role[]> = {
  'billing.manage': ['owner'],
  'site.settings': ['owner', 'admin'],
  'team.manage': ['owner', 'admin'],
  'design.update': ['owner', 'admin', 'editor'],
  'content.publish': ['owner', 'admin', 'editor'],
  'content.write': ['owner', 'admin', 'editor', 'author'],
  'form.read': ['owner', 'admin', 'editor', 'viewer'],
  'site.view': ['owner', 'admin', 'editor', 'author', 'viewer'],
};

export const can = (role: Role, action: Action): boolean => PERMISSIONS[action].includes(role);

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);
