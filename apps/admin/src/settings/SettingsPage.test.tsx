import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ContentSummary, DomainSummary, MemberSummary, SiteSummary } from '@lumio/shared';
import { RedirectsView } from './RedirectsPanel.js';
import { BackupView, DomainView, GeneralView, LanguageView, TeamView } from './SettingsPage.js';

const site: SiteSummary = {
  id: 's1',
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th'],
  plan: 'pro',
  role: 'owner',
  createdAt: '2026-10-20T00:00:00.000Z',
  logoUrl: null,
  faviconUrl: null,
};

const domain = (overrides: Partial<DomainSummary> = {}): DomainSummary => ({
  id: 'd1',
  hostname: 'baandoi.com',
  isPrimary: false,
  sslStatus: 'pending',
  verifiedAt: null,
  createdAt: '2026-10-20T00:00:00.000Z',
  ...overrides,
});

const member = (overrides: Partial<MemberSummary> = {}): MemberSummary => ({
  userId: 'u1',
  email: 'owner@example.com',
  name: 'สมชาย',
  avatarUrl: null,
  role: 'owner',
  joinedAt: '2026-10-20T00:00:00.000Z',
  ...overrides,
});

describe('LanguageView', () => {
  const languageProps = (overrides: Partial<Parameters<typeof LanguageView>[0]> = {}) => ({
    site,
    locales: ['th'],
    defaultLocale: 'th',
    saving: false,
    error: null,
    onToggle: vi.fn(),
    onDefaultChange: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  });

  it('lists the languages the product supports and marks the main one', () => {
    const html = renderToStaticMarkup(<LanguageView {...languageProps()} />);
    expect(html).toContain('ไทย');
    expect(html).toContain('English');
    expect(html).toContain('ภาษาหลัก');
  });

  it('disables saving until something changes', () => {
    expect(renderToStaticMarkup(<LanguageView {...languageProps()} />)).toMatch(/disabled/);
  });

  it('enables saving once the list of languages changes', () => {
    const html = renderToStaticMarkup(
      <LanguageView {...languageProps({ locales: ['th', 'en'] })} />,
    );
    expect(html).not.toMatch(/ui-button--primary[^>]*disabled/);
  });

  it('shows a save error to the user', () => {
    const html = renderToStaticMarkup(
      <LanguageView {...languageProps({ error: 'บันทึกไม่สำเร็จ' })} />,
    );
    expect(html).toContain('บันทึกไม่สำเร็จ');
  });
});

describe('GeneralView', () => {
  it('shows the site name and the free address with a hint', () => {
    const html = renderToStaticMarkup(
      <GeneralView
        site={site}
        name="กาแฟบ้านดอย"
        subdomain="baandoi"
        saving={false}
        error={null}
        onNameChange={vi.fn()}
        onSubdomainChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(html).toContain('ชื่อเว็บ');
    expect(html).toContain('baandoi.example.com');
    expect(html.match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('disables save until something actually changes', () => {
    const unchanged = renderToStaticMarkup(
      <GeneralView
        site={site}
        name="กาแฟบ้านดอย"
        subdomain="baandoi"
        saving={false}
        error={null}
        onNameChange={vi.fn()}
        onSubdomainChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(unchanged).toContain('disabled');
  });

  it('offers logo and favicon fields in the same save step', () => {
    const html = renderToStaticMarkup(
      <GeneralView
        site={site}
        name="กาแฟบ้านดอย"
        subdomain="baandoi"
        saving={false}
        error={null}
        onNameChange={vi.fn()}
        onSubdomainChange={vi.fn()}
        onSave={vi.fn()}
        logoUrl="https://cdn.example.com/logo.png"
        faviconUrl={null}
        brandDirty
        onPickLogo={vi.fn()}
        onPickFavicon={vi.fn()}
        onRemoveLogo={vi.fn()}
      />,
    );

    expect(html).toContain('โลโก้และไอคอน');
    expect(html).toContain('https://cdn.example.com/logo.png');
    expect(html).not.toMatch(/ui-button--primary[^>]*disabled/);
  });
});

describe('DomainView', () => {
  const base = {
    cnameTarget: 'baandoi.example.com',
    hostname: '',
    busy: false,
    error: null,
    onHostnameChange: vi.fn(),
    onAdd: vi.fn(),
    onVerify: vi.fn(),
    onRemove: vi.fn(),
  };

  it('explains where to point the domain when none is connected', () => {
    const html = renderToStaticMarkup(<DomainView {...base} domains={[]} />);
    expect(html).toContain('ที่อยู่ฟรีของเว็บคุณ: baandoi.example.com');
    expect(html).toContain('ยังไม่ได้เชื่อมโดเมนของตัวเอง');
  });

  it('lists connected domains with their status and a re-check', () => {
    const html = renderToStaticMarkup(<DomainView {...base} domains={[domain()]} />);
    expect(html).toContain('baandoi.com');
    expect(html).toContain('รอตั้งค่า DNS ให้ชี้มาที่เว็บ');
    expect(html).toContain('ตรวจสอบ');

    const active = renderToStaticMarkup(
      <DomainView {...base} domains={[domain({ sslStatus: 'active' })]} />,
    );
    expect(active).toContain('ใช้งานได้แล้ว');
  });
});

describe('TeamView', () => {
  const base = {
    email: '',
    role: 'editor' as const,
    busy: false,
    error: null,
    onEmailChange: vi.fn(),
    onRoleChange: vi.fn(),
    onInvite: vi.fn(),
    onMemberRoleChange: vi.fn(),
    onRemove: vi.fn(),
  };

  it('cannot change or remove the owner', () => {
    const html = renderToStaticMarkup(<TeamView {...base} members={[member()]} />);
    expect(html).toContain('เจ้าของเว็บ');
    expect(html).not.toContain('นำออก');
  });

  it('lets other members change role or be removed', () => {
    const html = renderToStaticMarkup(
      <TeamView
        {...base}
        members={[member(), member({ userId: 'u2', email: 'e@example.com', name: null, role: 'editor' })]}
      />,
    );
    expect(html).toContain('นำออก');
    expect(html).toContain('e@example.com');
  });

  it('keeps exactly one primary button', () => {
    const html = renderToStaticMarkup(<TeamView {...base} members={[member()]} />);
    expect(html.match(/ui-button--primary/g)).toHaveLength(1);
  });
});

describe('BackupView', () => {
  const trashed = (overrides: Partial<ContentSummary> = {}): ContentSummary => ({
    id: 'c1',
    type: 'page',
    title: 'หน้าโปรโมชันเก่า',
    slug: 'old-promo',
    status: 'archived',
    locale: 'th',
    translationGroupId: 'c1',
    access: 'public',
    excerpt: null,
    revision: 3,
    updatedAt: '2026-10-10T09:00:00.000Z',
    publishedAt: null,
    archivedAt: '2026-10-18T09:00:00.000Z',
    ...overrides,
  });

  const base = {
    items: [] as ContentSummary[],
    loading: false,
    error: null,
    busy: false,
    exporting: false,
    onReload: vi.fn(),
    onRestore: vi.fn(),
    onPurge: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
  };

  it('explains where version history lives and how long the trash keeps things', () => {
    const html = renderToStaticMarkup(<BackupView {...base} />);
    expect(html).toContain('ประวัติเวอร์ชัน');
    expect(html).toContain('ถังขยะ');
    expect(html).toContain('30 วัน');
    expect(html).toContain('ถังขยะว่าง');
  });

  it('lists trashed items with the days left and restore / delete actions', () => {
    const html = renderToStaticMarkup(<BackupView {...base} items={[trashed()]} />);
    expect(html).toContain('หน้าโปรโมชันเก่า');
    expect(html).toContain('ลบอัตโนมัติในอีก');
    expect(html).toContain('กู้คืน');
    expect(html).toContain('ลบถาวร');
  });

  it('surfaces a load failure with a retry', () => {
    const html = renderToStaticMarkup(<BackupView {...base} error="เชื่อมต่อไม่สำเร็จ" />);
    expect(html).toContain('เปิดถังขยะไม่สำเร็จ');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('offers a whole-site download and a restore from a file', () => {
    const html = renderToStaticMarkup(<BackupView {...base} />);
    expect(html).toContain('สำรองข้อมูลทั้งเว็บ');
    expect(html).toContain('ดาวน์โหลดไฟล์สำรอง');
    expect(html).toContain('นำเข้าไฟล์สำรอง');
    expect(html).toContain('type="file"');
  });
});

describe('RedirectsView', () => {
  const base = {
    fromPath: '',
    toPath: '',
    code: 301 as const,
    busy: false,
    error: null,
    onFromPathChange: vi.fn(),
    onToPathChange: vi.fn(),
    onCodeChange: vi.fn(),
    onAdd: vi.fn(),
    onSave: vi.fn(async () => true),
    onRemove: vi.fn(),
  };

  it('explains the feature and disables adding until both addresses are filled', () => {
    const html = renderToStaticMarkup(<RedirectsView {...base} items={[]} />);
    expect(html).toContain('เปลี่ยนเส้นทาง');
    expect(html).toContain('ยังไม่มีการเปลี่ยนเส้นทาง');
    expect(html).toMatch(/ui-button--primary[^>]*disabled/);
    // Both address inputs share the row instead of collapsing to label width.
    expect(html.match(/settings-inline__field/g)).toHaveLength(2);
    expect(html).toContain('settings-inline__action');
  });

  it('lists a rule with where it points and its type', () => {
    const html = renderToStaticMarkup(
      <RedirectsView
        {...base}
        items={[
          {
            fromPath: '/promo-2025',
            toPath: '/promotions',
            code: 301,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
        ]}
      />,
    );

    expect(html).toContain('/promo-2025');
    expect(html).toContain('/promotions');
    expect(html).toContain('ถาวร (301)');
  });
});
