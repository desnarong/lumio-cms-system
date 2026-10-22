import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard.js';
import type { FeaturesService } from './features.service.js';

const SITE_ID = '00000000-0000-4000-8000-0000000000d1';

const context = (siteId: string | undefined): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, user: { id: 'u1' }, siteId }),
    }),
  }) as unknown as ExecutionContext;

const guard = (feature: unknown, enabled: boolean) => {
  const reflector = {
    getAllAndOverride: () => feature,
  } as unknown as Reflector;
  const features = {
    isEnabled: vi.fn().mockResolvedValue(enabled),
  } as unknown as FeaturesService;
  return { guard: new FeatureGuard(features, reflector), features };
};

describe('FeatureGuard', () => {
  it('lets a route without a feature through', async () => {
    const { guard: instance } = guard(undefined, false);

    await expect(instance.canActivate(context(SITE_ID))).resolves.toBe(true);
  });

  it('lets the request through when the site still offers the add-on', async () => {
    const { guard: instance, features } = guard('commerce', true);

    await expect(instance.canActivate(context(SITE_ID))).resolves.toBe(true);
    expect(features.isEnabled).toHaveBeenCalledWith(SITE_ID, 'commerce');
  });

  it('refuses with a business-language message when it is closed', async () => {
    const { guard: instance } = guard('commerce', false);

    await expect(instance.canActivate(context(SITE_ID))).rejects.toMatchObject({
      code: 'forbidden',
      message: expect.stringContaining('ตั้งค่า › ส่วนเสริม'),
    });
  });

  it('requires a resolved site before checking a flag', async () => {
    const { guard: instance } = guard('commerce', true);

    await expect(instance.canActivate(context(undefined))).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });
});
