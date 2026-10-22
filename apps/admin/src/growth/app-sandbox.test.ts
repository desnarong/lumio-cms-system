import { describe, expect, it } from 'vitest';
import { allowedBridgeMethods, sampleAppDocument } from './AppSandbox.js';

describe('allowedBridgeMethods', () => {
  it('keeps only the methods whose scope was granted', () => {
    expect(allowedBridgeMethods(['analytics:read'])).toEqual(['analytics.summary']);
    expect(allowedBridgeMethods(['contents:read', 'forms:read'])).toEqual([
      'contents.list',
      'forms.list',
    ]);
  });

  it('grants nothing for an App with no scopes', () => {
    expect(allowedBridgeMethods([])).toEqual([]);
  });
});

describe('sampleAppDocument', () => {
  it('gives the App a button per allowed method', () => {
    const html = sampleAppDocument('ตัวช่วย SEO', ['contents.list', 'analytics.summary']);
    expect(html).toContain('ตัวช่วย SEO');
    expect(html).toContain('data-method="contents.list"');
    expect(html).toContain('data-method="analytics.summary"');
    // The App talks to the bridge only through postMessage.
    expect(html).toContain('window.parent.postMessage');
  });

  it('says so when the App has no access at all', () => {
    const html = sampleAppDocument('App เปล่า', []);
    expect(html).toContain('ไม่ได้รับสิทธิ์เข้าถึงข้อมูล');
    // No method buttons are rendered; the script still listens for them.
    expect(html).not.toContain('<button data-method');
  });
});
