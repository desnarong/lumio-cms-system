import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AdminRoute } from '../route.js';
import { MessagesProvider, type UiLocale } from '@lumio/ui';
import { AdminShell } from './AdminShell.js';

interface RenderOptions {
  locale?: UiLocale;
  onLocaleChange?: () => void;
  canCreate?: boolean;
  features?: readonly ('ai' | 'analytics' | 'newsletter' | 'apps' | 'commerce')[];
}

const render = (
  role: 'owner' | 'admin' | 'editor' | 'viewer' = 'owner',
  route: AdminRoute = { name: 'dashboard' },
  options: RenderOptions = {},
) =>
  renderToStaticMarkup(
    <MessagesProvider locale={options.locale ?? 'th'}>
      <AdminShell
        route={route}
        siteName="กาแฟบ้านดอย"
        userName="สมชาย"
        role={role}
        publicUrl="https://baandoi.example.com"
        locale={options.locale ?? 'th'}
        {...(options.features ? { features: options.features } : {})}
        {...(options.canCreate === undefined ? {} : { canCreate: options.canCreate })}
        {...(options.onLocaleChange ? { onLocaleChange: options.onLocaleChange } : {})}
        onCreate={vi.fn()}
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      >
        <p>เนื้อหาหน้าจอ</p>
      </AdminShell>
    </MessagesProvider>,
  );

describe('AdminShell sidebar', () => {
  it('lists nine flat destinations under three business labels', () => {
    const html = render();

    for (const label of [
      'งานประจำวัน',
      'ร้านค้า',
      'เว็บไซต์',
      'ภาพรวม',
      'หน้าเว็บ',
      'บทความ',
      'ไฟล์สื่อ',
      'ดีไซน์',
      'เติบโต',
      'ตั้งค่า',
    ]) {
      expect(html).toContain(label);
    }
  });

  it('never lists a tab in the sidebar, so no choice is offered twice', () => {
    const html = render();

    for (const tab of ['เมนูนำทาง', 'เปลี่ยน Template', 'ทีมงาน & สิทธิ์', 'สถิติผู้เข้าชม']) {
      expect(html).not.toContain(tab);
    }
  });

  it('hides the doors a viewer cannot open', () => {
    const viewer = render('viewer');

    expect(viewer).not.toContain('ดีไซน์');
    expect(viewer).not.toContain('เติบโต');
    expect(viewer).not.toContain('ตั้งค่า');
    expect(viewer).not.toContain('ร้านค้า');
    expect(viewer).toContain('หน้าเว็บ');
  });

  it('hides the shop when the site closed the commerce add-on', () => {
    const html = render(
      'owner',
      { name: 'dashboard' },
      {
        features: ['ai', 'analytics', 'newsletter', 'apps'],
      },
    );

    expect(html).not.toContain('/commerce/products');
    expect(html).toContain('/design/style');
  });

  it('marks the open screen once and keeps a single navigation landmark', () => {
    const html = render('owner', { name: 'design', tab: 'menus' });

    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('href="/design/style"');
    expect(html.match(/aria-label="เมนูหลัก"/g)).toHaveLength(1);
    expect(html).not.toContain('เมนูหลักบนมือถือ');
  });

  it('links the brand back to the overview', () => {
    const html = render();

    expect(html).toContain('shell-brand');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('กาแฟบ้านดอย');
  });

  it('folds the sidebar with a button that says what it does', () => {
    const html = render();

    expect(html).toContain('shell-collapse');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('ย่อเมนู');
  });
});

describe('AdminShell top bar', () => {
  it('opens the command palette from the search field, with its shortcut', () => {
    const html = render();

    expect(html).toContain('shell-search');
    expect(html).toContain('aria-keyshortcuts="Control+K Meta+K"');
    expect(html).toContain('⌘K');
    // The palette itself only renders once opened.
    expect(html).not.toContain('ui-command');
  });

  it('offers create, view site, language and sign out, and each one acts', () => {
    const html = render('owner', { name: 'dashboard' }, { onLocaleChange: vi.fn() });

    expect(html).toContain('shell-create');
    expect(html).toContain('สร้างใหม่');
    expect(html).toContain('aria-label="ตัวเลือกเพิ่มเติม"');
    expect(html).toContain('href="https://baandoi.example.com"');
    expect(html).toContain('shell-topbar__language');
    expect(html).toContain('aria-label="ออกจากระบบ"');
  });

  it('leaves the create button out when the role may not create', () => {
    expect(render('viewer', { name: 'dashboard' }, { canCreate: false })).not.toContain(
      'shell-create',
    );
  });

  it('names the signed-in user and their role', () => {
    const html = render();

    expect(html).toContain('สมชาย');
    expect(html).toContain('เจ้าของเว็บ');
    expect(html).toContain('shell-user__avatar');
  });

  it('offers the language switcher only when the screen can change it', () => {
    expect(render('owner', { name: 'dashboard' }, { onLocaleChange: vi.fn() })).toContain(
      'shell-topbar__language',
    );
    expect(render()).not.toContain('shell-topbar__language');
  });

  it('names the language button so a screen reader can reach it', () => {
    const html = render('owner', { name: 'dashboard' }, { locale: 'en', onLocaleChange: vi.fn() });

    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('ไทย');
  });
});

describe('AdminShell content', () => {
  it('renders the screen inside a landmark keyboard users can jump to', () => {
    const html = render();

    expect(html).toContain('เนื้อหาหน้าจอ');
    expect(html).toContain('shell-skip');
    expect(html).toContain('href="#shell-content"');
    expect(html).toContain('id="shell-content"');
  });

  it('says the back office wants a desktop window', () => {
    const html = render();

    expect(html).toContain('shell-narrow');
    expect(html).toContain('จอคอมพิวเตอร์');
  });

  it('renders the whole chrome in English when the language is English', () => {
    const html = render('owner', { name: 'dashboard' }, { locale: 'en' });

    for (const label of ['Overview', 'Pages', 'Design', 'Settings', 'Everyday work']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Sign out');
    expect(html).toContain('Create');
    // Thai wording must not leak next to the English one.
    expect(html).not.toContain('ภาพรวม');
    expect(html).not.toContain('ออกจากระบบ');
  });
});
