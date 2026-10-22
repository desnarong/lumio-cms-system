import { describe, expect, it } from 'vitest';
import { lumioSignatureHeader, verifyLumioSignature } from './webhook-signature.js';

const secret = 'a-very-long-test-secret';
const body = JSON.stringify({ event: 'order.paid', order: { number: 'LM-1' } });
const now = 1_792_000_000_000;

const verify = async (overrides: Partial<Parameters<typeof verifyLumioSignature>[0]> = {}) => {
  const timestamp = 1_792_000_000;
  const header = await lumioSignatureHeader({ secret, timestamp, body });
  return verifyLumioSignature({ secret, timestamp, body, header, now, ...overrides });
};

describe('verifyLumioSignature', () => {
  it('accepts a delivery signed with the shop secret', async () => {
    await expect(verify()).resolves.toBe(true);
  });

  it('rejects a body that changed after signing', async () => {
    const timestamp = 1_792_000_000;
    const header = await lumioSignatureHeader({ secret, timestamp, body });

    await expect(
      verifyLumioSignature({
        secret,
        timestamp,
        body: body.replace('LM-1', 'LM-2'),
        header,
        now,
      }),
    ).resolves.toBe(false);
  });

  it('rejects another secret', async () => {
    await expect(verify({ secret: 'another-secret' })).resolves.toBe(false);
  });

  it('rejects a header that is not sha256 hex', async () => {
    await expect(verify({ header: 'md5=abc' })).resolves.toBe(false);
    await expect(verify({ header: 'sha256=zz' })).resolves.toBe(false);
  });

  it('rejects a delivery older than the tolerance window', async () => {
    await expect(verify({ now: now + 10 * 60_000 })).resolves.toBe(false);
    await expect(verify({ now: now + 4 * 60_000 })).resolves.toBe(true);
  });

  it('keeps a replay inside the window acceptable', async () => {
    await expect(verify({ now: now + 60_000 })).resolves.toBe(true);
  });

  it('refuses an empty secret', async () => {
    await expect(verify({ secret: '' })).resolves.toBe(false);
  });
});
