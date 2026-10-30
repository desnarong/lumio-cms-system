import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PublicPage } from '@lumio/shared';
import { PaywallNotice } from './components/PaywallNotice';
import { MembershipNotice, membershipNotice } from './components/MembershipPanels';
import { PageView } from './components/PageView';
import { READER_COOKIE, clearedReaderCookie, readerCookie } from './lib/reader';

const page = (overrides: Partial<PublicPage> = {}): PublicPage => ({
  site: {
    id: 'site-1',
    name: 'กาแฟบ้านดอย',
    subdomain: 'baandoi',
    localeDefault: 'th',
    locales: ['th'],
    settings: {},
    logoUrl: null,
    faviconUrl: null,
    themeTokens: {},
  },
  content: {
    id: 'content-1',
    type: 'post',
    title: 'บทความสำหรับสมาชิก',
    slug: 'members-post',
    locale: 'th',
    excerpt: 'บทความนี้เปิดให้สมาชิกอ่าน',
    seo: { noindex: true },
    access: 'members',
    blocks: [],
    publishedAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    coverImage: null,
  },
  menus: { header: [], footer: [] },
  globalBlocks: { header: [], footer: [] },
  forms: [],
  locale: 'th',
  isFallback: false,
  translations: [],
  redirect: null,
  paywall: { locked: true, plans: [] },
  ...overrides,
});

describe('PaywallNotice', () => {
  it('offers the plans and a way in for a visitor', () => {
    const html = renderToStaticMarkup(
      <PaywallNotice
        plans={[
          {
            id: 'plan-1',
            name: 'สมาชิกตอบแทน',
            description: 'อ่านทุกบทความ',
            interval: 'month',
            price: 19900,
            currency: 'THB',
          },
        ]}
        signedIn={false}
      />,
    );

    expect(html).toContain('สมาชิกตอบแทน');
    expect(html).toContain('฿199');
    expect(html).toContain('/membership');
    expect(html).toContain('สมัครหรือเข้าสู่ระบบ');
  });

  it('asks a signed-in reader to pick a plan instead of signing in again', () => {
    const html = renderToStaticMarkup(<PaywallNotice plans={[]} signedIn />);
    expect(html).toContain('เลือกแพ็กเกจ');
    expect(html).not.toContain('สมัครหรือเข้าสู่ระบบ');
  });
});

describe('PageView paywall', () => {
  it('shows the teaser instead of the locked body', () => {
    const html = renderToStaticMarkup(<PageView page={page()} host="baandoi.example.com" />);
    expect(html).toContain('บทความนี้เปิดให้สมาชิกอ่าน');
    expect(html).toContain('เข้าร่วมเพื่ออ่านต่อ');
  });

  it('renders the page normally when nothing is locked', () => {
    const html = renderToStaticMarkup(
      <PageView
        page={page({
          content: { ...page().content!, access: 'public', seo: { noindex: false } },
          paywall: null,
        })}
        host="baandoi.example.com"
      />,
    );
    expect(html).not.toContain('เข้าร่วมเพื่ออ่านต่อ');
  });
});

describe('membership notices', () => {
  it('explains a wrong password and an unknown failure', () => {
    expect(membershipNotice('sign-in')).toContain('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    expect(membershipNotice('nonsense')).toBeTruthy();
    expect(membershipNotice(null)).toBeNull();
    const html = renderToStaticMarkup(<MembershipNotice code="exists" />);
    expect(html).toContain('มีบัญชีอยู่แล้ว');
  });
});

describe('reader cookie', () => {
  it('is httpOnly and lasts thirty days', () => {
    const cookie = readerCookie('token');
    expect(cookie.name).toBe(READER_COOKIE);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('lax');
    expect(cookie.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it('clears the session on sign out', () => {
    expect(clearedReaderCookie().maxAge).toBe(0);
    expect(clearedReaderCookie().value).toBe('');
  });
});
