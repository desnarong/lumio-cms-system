import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { patchOf } from './patch';

const settings = z.object({
  name: z.string().default('shop'),
  open: z.boolean().default(true),
  limit: z.number(),
});

describe('patchOf', () => {
  it('keeps omitted keys omitted instead of resetting them to defaults', () => {
    expect(patchOf(settings).parse({ limit: 3 })).toEqual({ limit: 3 });
  });

  it('still validates the keys that are sent', () => {
    expect(patchOf(settings).parse({ name: 'cafe', open: false })).toEqual({
      name: 'cafe',
      open: false,
    });
    expect(patchOf(settings).safeParse({ limit: 'many' }).success).toBe(false);
  });

  it('shows why a plain partial() is not enough on zod 4', () => {
    expect(settings.partial().parse({})).toEqual({ name: 'shop', open: true });
  });
});
