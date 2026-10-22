import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App, AdminApp } from './App';
import { createAdminClients } from './clients.js';
import { createMemoryStorage } from './auth/session.js';

const demoClients = () => createAdminClients({ apiUrl: '', storage: createMemoryStorage() });

const render = (): string => renderToStaticMarkup(<App clients={demoClients()} />);

describe('App shell', () => {
  it('opens on the sign-in screen when nobody is signed in', () => {
    const html = render();

    expect(html).toContain('เข้าสู่ระบบ');
    expect(html).toContain('อีเมล');
    expect(html).toContain('รหัสผ่าน');
  });

  it('keeps exactly one primary button on the sign-in screen', () => {
    expect(render().match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('explains the demo credentials when no API is configured', () => {
    expect(render()).toContain('owner@example.com');
  });

  it('waits for the session check when a session is already stored', () => {
    const clients = demoClients();
    clients.session.write({
      accessToken: 'token',
      user: { id: 'u1', email: 'owner@example.com', name: 'สมชาย', avatarUrl: null },
      siteId: 'demo-site-1',
    });

    const html = renderToStaticMarkup(<AdminApp clients={clients} />);

    expect(html).toContain('กำลังเปิดเว็บของคุณ');
  });

  it('uses business language instead of technical jargon', () => {
    const html = render();
    for (const jargon of ['Post type', 'Slug', 'Permalink', 'Widget', 'Shortcode', 'Taxonomy']) {
      expect(html).not.toContain(jargon);
    }
  });
});
