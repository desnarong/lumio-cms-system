import { describe, expect, it } from 'vitest';
import {
  BUILTIN_BLOCK_TYPES,
  comparePackVersions,
  isBuiltinBlockType,
  marketplaceInstallSchema,
  marketplacePackSchema,
  parseMarketplacePackToken,
  packBlockTypes,
  type MarketplacePack,
} from './marketplace.js';

const block = (type: string, children: unknown[] = []): Record<string, unknown> => ({
  id: `${type}-1`,
  type,
  version: 1,
  props: {},
  children,
});

const pack = (overrides: Partial<MarketplacePack> = {}): Record<string, unknown> => ({
  v: 1,
  key: 'lumio-launch',
  name: 'ชุดเปิดตัวเว็บ',
  description: 'ส่วนหน้าแรกพร้อมใช้',
  version: '1.2.0',
  author: 'Lumio',
  sections: [{ name: 'หน้าแรก', blocks: [block('hero'), block('features')] }],
  ...overrides,
});

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const token = (value: unknown, signature = 'a'.repeat(86)): string =>
  `lumio_pack_v1.${encode(value)}.${signature}`;

describe('packBlockTypes', () => {
  it('includes the types of nested blocks', () => {
    expect(packBlockTypes([block('hero', [block('button')])] as never)).toEqual(['hero', 'button']);
  });
});

describe('marketplacePackSchema', () => {
  it('accepts a pack built only from shipped blocks', () => {
    const parsed = marketplacePackSchema.safeParse(pack());

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sections).toHaveLength(1);
  });

  it('rejects a pack that asks for anything beyond data', () => {
    const parsed = marketplacePackSchema.safeParse({ ...pack(), entry: 'index.html' });

    expect(parsed.success).toBe(false);
  });

  it('rejects a pack that references a block this build does not ship', () => {
    const parsed = marketplacePackSchema.safeParse(
      pack({ sections: [{ name: 'กล่อง', blocks: [block('mystery')] }] }),
    );

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toContain('mystery');
  });

  it('refuses a section without blocks', () => {
    expect(
      marketplacePackSchema.safeParse(pack({ sections: [{ name: 'ว่าง', blocks: [] }] })).success,
    ).toBe(false);
  });

  it('refuses a version that is not 1.2.3', () => {
    expect(marketplacePackSchema.safeParse(pack({ version: 'v1' })).success).toBe(false);
  });
});

describe('parseMarketplacePackToken', () => {
  it('splits a signed pack into the signed text and its manifest', () => {
    const parsed = parseMarketplacePackToken(token(pack()));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.parsed.pack.key).toBe('lumio-launch');
    expect(parsed.parsed.signature).toHaveLength(64);
    expect(parsed.parsed.signingInput.startsWith('lumio_pack_v1.')).toBe(true);
  });

  it('rejects text that is not a Lumio pack', () => {
    expect(parseMarketplacePackToken('lumio_pack_v1.abc')).toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(parseMarketplacePackToken('')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a payload that breaks the schema', () => {
    expect(parseMarketplacePackToken(token({ ...pack(), version: 'latest' }))).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a signature that is not 64 bytes', () => {
    expect(parseMarketplacePackToken(token(pack(), 'short'))).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });
});

describe('comparePackVersions', () => {
  it('orders releases numerically, not alphabetically', () => {
    expect(comparePackVersions('1.10.0', '1.9.5')).toBe(1);
    expect(comparePackVersions('1.0.0', '1.0.0')).toBe(0);
    expect(comparePackVersions('0.9.9', '1.0.0')).toBe(-1);
  });

  it('sorts a pre-release before its release', () => {
    expect(comparePackVersions('2.0.0-beta.1', '2.0.0')).toBe(-1);
  });
});

describe('isBuiltinBlockType', () => {
  it('knows the shipped blocks and nothing else', () => {
    expect(isBuiltinBlockType(BUILTIN_BLOCK_TYPES[0])).toBe(true);
    expect(isBuiltinBlockType('mystery')).toBe(false);
  });
});

describe('marketplaceInstallSchema', () => {
  it('accepts either a catalogue key or a signed token', () => {
    expect(marketplaceInstallSchema.safeParse({ key: 'lumio-launch' }).success).toBe(true);
    expect(marketplaceInstallSchema.safeParse({ token: token(pack()) }).success).toBe(true);
  });

  it('refuses an empty install', () => {
    expect(marketplaceInstallSchema.safeParse({}).success).toBe(false);
  });

  it('refuses a request that asks for both sources at once', () => {
    expect(
      marketplaceInstallSchema.safeParse({ key: 'lumio-launch', token: token(pack()) }).success,
    ).toBe(false);
  });
});
