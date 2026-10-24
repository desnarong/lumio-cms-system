import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ContentTranslations } from '@lumio/shared';
import { LanguageBarView, type LanguageBarViewProps } from './LanguageBar.js';

const translations: ContentTranslations = {
  groupId: 'g1',
  defaultLocale: 'th',
  items: [
    { locale: 'th', contentId: 'c1', title: 'หน้าแรก', slug: 'home', status: 'published', exists: true },
    { locale: 'en', contentId: null, title: null, slug: null, status: null, exists: false },
  ],
};

const props = (overrides: Partial<LanguageBarViewProps> = {}): LanguageBarViewProps => ({
  translations,
  contentId: 'c1',
  creating: null,
  title: '',
  slug: 'home',
  translate: false,
  busy: false,
  showTranslate: false,
  translating: false,
  onTranslate: vi.fn(),
  onOpenLanguage: vi.fn(),
  onLocaleChange: vi.fn(),
  onTitleChange: vi.fn(),
  onSlugChange: vi.fn(),
  onTranslateChange: vi.fn(),
  onCloseDialog: vi.fn(),
  onSubmit: vi.fn(),
  ...overrides,
});

const render = (overrides: Partial<LanguageBarViewProps> = {}): string =>
  renderToStaticMarkup(<LanguageBarView {...props(overrides)} />);

describe('LanguageBarView', () => {
  it('shows a badge per language with its publish state', () => {
    const html = render();

    expect(html).toContain('ไทย');
    expect(html).toContain('English');
    expect(html).toContain('เผยแพร่แล้ว');
    expect(html).toContain('ยังไม่มี');
  });

  it('marks the current language as selected and not clickable', () => {
    const html = render();
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('disabled');
  });

  it('marks a language with no page as missing', () => {
    expect(render()).toContain('data-state="missing"');
  });

  it('keeps a single primary button when the create dialog is open', () => {
    const html = render({ creating: 'en' });
    expect(html).toContain('สร้างคำแปล English');
    expect(html).toContain('ชื่อลิงก์');
    // Only "สร้างคำแปล" is primary; ยกเลิก stays a ghost button (04-ux.md 4.5).
    expect(html.match(/ui-button--primary/g) ?? []).toHaveLength(1);
  });

  it('hides the dialog until a language is chosen', () => {
    expect(render()).not.toContain('สร้างคำแปลEnglish');
  });

  it('offers "translate the rest" only for a page that is not the main language', () => {
    expect(render()).not.toContain('แปลข้อความที่เหลือ');
    expect(render({ showTranslate: true })).toContain('แปลข้อความที่เหลือ');
  });

  it('shows progress while the assistant is translating', () => {
    const html = render({ showTranslate: true, translating: true });
    expect(html).toContain('กำลังแปล');
    expect(html).toContain('disabled');
  });
});