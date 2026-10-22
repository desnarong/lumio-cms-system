import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PublishSettingsInput, PublishSettingsView } from '@lumio/shared';
import { PublishView } from './PublishPanel.js';

const settings = (overrides: Partial<PublishSettingsView> = {}): PublishSettingsView => ({
  rendererUrl: 'https://renderer.example.com',
  staticPublishUrl: 'https://cdn.example.com/upload',
  hasStaticPublishSecret: true,
  cdnPurgeUrl: 'https://cdn.example.com/purge',
  hasCdnPurgeSecret: false,
  purgeOnPublish: true,
  staticReady: true,
  purgeReady: true,
  lastRun: null,
  updatedAt: '2026-10-22T00:00:00.000Z',
  ...overrides,
});

const draft = (overrides: Partial<PublishSettingsInput> = {}): PublishSettingsInput => ({
  rendererUrl: 'https://renderer.example.com',
  staticPublishUrl: 'https://cdn.example.com/upload',
  cdnPurgeUrl: 'https://cdn.example.com/purge',
  purgeOnPublish: true,
  ...overrides,
});

const props = (overrides: Partial<Parameters<typeof PublishView>[0]> = {}) => ({
  settings: settings(),
  draft: draft(),
  staticSecret: '',
  purgeSecret: '',
  saving: false,
  testing: false,
  error: null,
  testMessage: null,
  onDraftChange: vi.fn(),
  onStaticSecretChange: vi.fn(),
  onPurgeSecretChange: vi.fn(),
  onSave: vi.fn(),
  onTest: vi.fn(),
  ...overrides,
});

describe('PublishView', () => {
  it('shows the addresses the owner filled in and a saved-key hint', () => {
    const html = renderToStaticMarkup(<PublishView {...props()} />);

    expect(html).toContain('https://renderer.example.com');
    expect(html).toContain('https://cdn.example.com/upload');
    expect(html).toContain('บันทึกคีย์ไว้แล้ว');
  });

  it('warns when no CDN is connected yet', () => {
    const html = renderToStaticMarkup(
      <PublishView
        {...props({
          settings: settings({ staticReady: false, staticPublishUrl: '' }),
          draft: draft({ staticPublishUrl: '' }),
        })}
      />,
    );

    expect(html).toContain('ยังไม่ได้เชื่อม CDN');
    expect(html).toContain('ภายใน 10 วินาที');
  });

  it('reports how long the last publish took and flags a slow one', () => {
    const fast = renderToStaticMarkup(
      <PublishView
        {...props({
          settings: settings({
            lastRun: { at: '2026-10-22T00:00:00.000Z', durationMs: 2_400, delivered: true, failures: [] },
          }),
        })}
      />,
    );
    expect(fast).toContain('2.4 วินาที');

    const slow = renderToStaticMarkup(
      <PublishView
        {...props({
          settings: settings({
            lastRun: { at: '2026-10-22T00:00:00.000Z', durationMs: 12_000, delivered: false, failures: ['/about'] },
          }),
        })}
      />,
    );
    expect(slow).toContain('เกิน 10 วินาที');
    expect(slow).toContain('/about');
  });
});
