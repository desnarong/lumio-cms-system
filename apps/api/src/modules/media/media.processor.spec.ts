import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { SharpImagePipeline } from './media.processor';
import type { MediaStorage } from './media.storage';

const storage = (): MediaStorage =>
  ({ put: vi.fn().mockResolvedValue(undefined) }) as unknown as MediaStorage;

const png = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: '#1f7a4d' } }).png().toBuffer();

describe('SharpImagePipeline input guard', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('refuses an image above the configured pixel budget', async () => {
    vi.stubEnv('MEDIA_MAX_INPUT_PIXELS', '1000');
    const pipeline = new SharpImagePipeline(storage());
    const buffer = await png(100, 100);

    await expect(pipeline.render({ key: 'a.png', mime: 'image/png', buffer })).rejects.toThrow();
  });

  it('renders the responsive ladder when the budget allows it', async () => {
    const target = storage();
    const pipeline = new SharpImagePipeline(target);
    const buffer = await png(100, 100);

    const rendered = await pipeline.render({ key: 'site/a.png', mime: 'image/png', buffer });

    expect(rendered.variants.map((variant) => variant.format)).toEqual(['webp', 'avif', 'png']);
    expect(target.put).toHaveBeenCalledTimes(2);
  });

  it('cuts every variant from the crop window and drops the uncropped original', async () => {
    const target = storage();
    const pipeline = new SharpImagePipeline(target);
    const buffer = await png(100, 100);

    const rendered = await pipeline.render({
      key: 'site/a.png',
      mime: 'image/png',
      buffer,
      crop: { x: 0, y: 0, width: 0.5, height: 0.5 },
    });

    expect(rendered).toMatchObject({ width: 50, height: 50 });
    expect(rendered.variants.map((variant) => variant.url)).toEqual([
      'site/a-100.webp',
      'site/a-100.avif',
      'site/a-crop.webp',
    ]);
    // The ladder keeps the original widths so pages that cached the srcset still resolve.
    expect(rendered.variants.map((variant) => variant.w)).toEqual([100, 100, 50]);
    const keys = vi.mocked(target.put).mock.calls.map((call) => call[0]);
    expect(keys).not.toContain('site/a.png');
    expect(keys).toContain('site/a-crop.webp');
  });

  it('returns the full picture again when the crop is cleared', async () => {
    const pipeline = new SharpImagePipeline(storage());
    const buffer = await png(100, 100);

    const rendered = await pipeline.render({
      key: 'site/a.png',
      mime: 'image/png',
      buffer,
      crop: null,
    });

    expect(rendered).toMatchObject({ width: 100, height: 100 });
    expect(rendered.variants[rendered.variants.length - 1]?.url).toBe('site/a.png');
  });
});
