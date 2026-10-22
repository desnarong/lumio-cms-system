import { describe, expect, it } from 'vitest';
import { MAX_BULK_MEDIA, bulkUpdateMediaInputSchema } from './media.js';

const ID = '00000000-0000-4000-8000-0000000000b1';
const OTHER = '00000000-0000-4000-8000-0000000000b2';

describe('bulkUpdateMediaInputSchema', () => {
  it('accepts describing several images and moving them', () => {
    const parsed = bulkUpdateMediaInputSchema.safeParse({
      ids: [ID, OTHER],
      alt: [
        { id: ID, alt: 'แก้วกาแฟ' },
        { id: OTHER, alt: null },
      ],
      folder: 'สินค้า',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a request that changes nothing', () => {
    expect(bulkUpdateMediaInputSchema.safeParse({ ids: [ID] }).success).toBe(false);
  });

  it('rejects an alt entry that is not in the selection', () => {
    expect(
      bulkUpdateMediaInputSchema.safeParse({
        ids: [ID],
        alt: [{ id: OTHER, alt: 'อื่น' }],
      }).success,
    ).toBe(false);
  });

  it('caps the selection', () => {
    const ids = Array.from(
      { length: MAX_BULK_MEDIA + 1 },
      (_value, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    );
    expect(bulkUpdateMediaInputSchema.safeParse({ ids, folder: 'x' }).success).toBe(false);
  });
});
