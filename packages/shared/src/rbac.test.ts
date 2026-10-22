import { describe, expect, it } from 'vitest';
import { ACTIONS, PERMISSIONS, ROLES, can, isRole } from './rbac.js';

describe('rbac', () => {
  it('allows only the owner to manage billing', () => {
    expect(can('owner', 'billing.manage')).toBe(true);
    expect(can('admin', 'billing.manage')).toBe(false);
  });

  it('prevents an author from publishing', () => {
    expect(can('author', 'content.publish')).toBe(false);
    expect(can('editor', 'content.publish')).toBe(true);
  });

  it('lets a viewer read but not write', () => {
    expect(can('viewer', 'site.view')).toBe(true);
    expect(can('viewer', 'content.write')).toBe(false);
  });

  it('defines permissions for every action', () => {
    for (const action of ACTIONS) {
      expect(PERMISSIONS[action].length).toBeGreaterThan(0);
    }
  });

  it('recognises valid roles only', () => {
    expect(ROLES).toContain('owner');
    expect(isRole('editor')).toBe(true);
    expect(isRole('superuser')).toBe(false);
  });
});
