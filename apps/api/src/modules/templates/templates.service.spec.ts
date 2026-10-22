import { describe, expect, it } from 'vitest';
import { TemplatesService } from './templates.service';

const withApiUrl = <T>(fn: () => T): T => {
  const previous = process.env.API_PUBLIC_URL;
  process.env.API_PUBLIC_URL = 'https://api.example.com';
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.API_PUBLIC_URL;
    else process.env.API_PUBLIC_URL = previous;
  }
};

describe('TemplatesService', () => {
  it('lists every shipped pack with an absolute preview URL', () => {
    const templates = withApiUrl(() => new TemplatesService().list());

    expect(templates.length).toBeGreaterThanOrEqual(3);
    for (const template of templates) {
      expect(template.previewUrl.startsWith('https://api.example.com/templates/')).toBe(true);
      expect(template.previewUrl.endsWith('/preview.png')).toBe(true);
      expect(template.pages.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('reads one template by id and hides the ones it does not ship', () => {
    const service = withApiUrl(() => new TemplatesService());
    const [first] = service.list();
    const detail = withApiUrl(() => service.summaryById(first!.id));

    expect(detail.id).toBe(first!.id);
    expect(() => service.summaryById('00000000-0000-4000-8000-0000000000ff')).toThrow(/ไม่พบเทมเพลต/);
  });

  it('picks a pack for each business type', () => {
    const service = withApiUrl(() => new TemplatesService());

    expect(service.forBusinessType('clinic').manifest.businessType).toBe('clinic');
    expect(service.forBusinessType('other').key).toBeTruthy();
  });
});
