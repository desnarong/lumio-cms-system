import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider } from '@lumio/ui';
import { DEFAULT_AGENCY_BRANDING, type AgencyBranding } from '@lumio/shared';
import { AdminShell } from './AdminShell.js';

const render = (branding: AgencyBranding | null): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <AdminShell
        route={{ name: 'dashboard' }}
        siteName="กาแฟบ้านดอย"
        userName="สมชาย"
        role="owner"
        branding={branding}
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      >
        <p>เนื้อหาหน้าจอ</p>
      </AdminShell>
    </MessagesProvider>,
  );

describe('white-label shell', () => {
  it('shows the Lumio credit until the owner hides it', () => {
    expect(render(null)).toContain('ขับเคลื่อนด้วย Lumio');
    expect(render(DEFAULT_AGENCY_BRANDING)).toContain('ขับเคลื่อนด้วย Lumio');
    expect(render({ ...DEFAULT_AGENCY_BRANDING, hideBranding: true })).not.toContain(
      'ขับเคลื่อนด้วย Lumio',
    );
  });

  it('prints the agency name instead of Lumio', () => {
    const html = render({ ...DEFAULT_AGENCY_BRANDING, brandName: 'เอเจนซี กรุ๊ป' });

    expect(html).toContain('เอเจนซี กรุ๊ป');
    expect(html).toContain('กาแฟบ้านดอย');
  });

  it('uses the uploaded logo and accent colour when given', () => {
    const html = render({
      ...DEFAULT_AGENCY_BRANDING,
      brandName: 'เอเจนซี',
      logoUrl: 'https://cdn.example.com/logo.webp',
      accentColor: '#17469d',
    });

    expect(html).toContain('https://cdn.example.com/logo.webp');
    expect(html).toContain('--color-primary:#17469d');
  });
});
