import { describe, expect, it } from 'vitest';
import { APP_PERMISSIONS } from '@lumio/shared';
import { PERMISSION_SCOPES } from '@lumio/sdk';

/**
 * The App store lives in `@lumio/shared` while the scope list lives in
 * `@lumio/sdk`. The admin is the one place that depends on both, so this is where
 * the two lists are kept from drifting apart.
 */
describe('App permissions', () => {
  it('matches the SDK permission scopes exactly', () => {
    expect([...APP_PERMISSIONS].sort()).toEqual([...PERMISSION_SCOPES].sort());
  });
});
