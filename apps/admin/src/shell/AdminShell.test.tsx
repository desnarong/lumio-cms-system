import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AdminRoute } from '../route.js';
import { MessagesProvider, type UiLocale } from '@lumio/ui';
import { AdminShell } from './AdminShell.js';

const render = (
  role: 'owner' | 'editor' | 'viewer' = 'owner',
  route: AdminRoute = { name: 'dashboard' },
  options: { locale?: UiLocale; onLocaleChange?: () => void } = {},
) =>
  renderToStaticMarkup(
    <MessagesProvider locale={options.locale ?? 'th'}>
      <AdminShell
        route={route}
        siteName="กาแฟบ้านดอย"
        userName="สมชาย"
        role={role}
        publicUrl="https://baandoi.lumio.app"
        locale={options.locale ?? 'th'}
        {...(options.onLocaleChange ? { onLocaleChange: options.onLocaleChange } : {})}
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      >
        <p>เนื้อหาหน้าจอ</p>
      </AdminShell>
    </MessagesProvider>,
  );

describe('AdminShell', () => {
  it('renders the five-menu structure with Thai business labels', () => {
    const html = render();

    for (const label of ['ภาพรวม', 'เนื้อหา', 'ดีไซน์', 'ตั้งค่า']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('หน้าเว็บ');
    expect(html).toContain('บทความ');
    expect(html).toContain('เปลี่ยน Template');
  });

  it('hides menus the role cannot open', () => {
    const viewer = render('viewer');
    expect(viewer).not.toContain('เปลี่ยน Template');
    expect(viewer).not.toContain('ทีมงาน');
  });

  it('marks the current screen and keeps one navigation landmark per layout', () => {
    const html = render('owner', { name: 'design', tab: 'style' });
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('/design/style');
    expect(html.match(/aria-label="เมนูหลัก"/g)).toHaveLength(1);
    expect(html.match(/aria-label="เมนูหลักบนมือถือ"/g)).toHaveLength(1);
  });

  it('greets the user, names the site and offers the public site', () => {
    const html = render();
    expect(html).toContain('สวัสดี คุณสมชาย');
    expect(html).toContain('กาแฟบ้านดอย');
    expect(html).toContain('https://baandoi.lumio.app');
    expect(html).toContain('ออกจากระบบ');
  });

  it('offers the command palette shortcut in the top bar', () => {
    const html = render();
    expect(html).toContain('shell-topbar__search');
    expect(html).toContain('aria-keyshortcuts="Control+K Meta+K"');
    expect(html).toContain('⌘K');
    // The palette itself only renders once opened.
    expect(html).not.toContain('ui-command');
  });

  it('renders the screen inside the shell', () => {
    expect(render()).toContain('เนื้อหาหน้าจอ');
  });

  it('renders the whole chrome in English when the language is English', () => {
    const html = render('owner', { name: 'dashboard' }, { locale: 'en' });

    for (const label of ['Overview', 'Content', 'Design', 'Settings', 'Pages']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Hello สมชาย');
    expect(html).toContain('Sign out');
    // Thai wording must not leak next to the English one.
    expect(html).not.toContain('ภาพรวม');
    expect(html).not.toContain('ออกจากระบบ');
  });

  it('offers the language switcher only when the screen can change it', () => {
    expect(render('owner', { name: 'dashboard' }, { onLocaleChange: vi.fn() })).toContain(
      'shell-topbar__language',
    );
    expect(render()).not.toContain('shell-topbar__language');
  });

  it('names the language button so it is reachable by screen reader', () => {
    const html = render('owner', { name: 'dashboard' }, { locale: 'en', onLocaleChange: vi.fn() });

    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('ไทย');
  });
});
