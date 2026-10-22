import { translateNow } from '@lumio/ui';
import {
  normalizeThemeTokens,
  type CreateSiteFromTemplateInput,
  type SiteLocaleStatus,
  type SiteSummary,
  type TemplateSummary,
  type ThemeTokens,
  type WizardSiteResult,
} from '@lumio/shared';
import { ApiError } from '../editor/api.js';
import type { WizardApi } from './api.js';

/** Inline preview so the demo wizard shows a picture without the API. */
const preview = (top: string, bottom: string, label: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480" viewBox="0 0 960 480" role="img" aria-label="${label}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
      `</linearGradient></defs><rect width="960" height="480" fill="url(#g)"/>` +
      `<rect x="64" y="72" width="560" height="40" rx="20" fill="#0F172A" opacity="0.85"/>` +
      `<rect x="64" y="136" width="380" height="40" rx="20" fill="#0F172A" opacity="0.85"/>` +
      `<rect x="64" y="212" width="620" height="18" rx="9" fill="#ffffff" opacity="0.75"/>` +
      `<rect x="64" y="248" width="480" height="18" rx="9" fill="#ffffff" opacity="0.75"/>` +
      `<rect x="64" y="308" width="240" height="56" rx="14" fill="#ffffff" opacity="0.92"/>` +
      `</svg>`,
  )}`;

const tokens = (primary: string, accent: string, heading: string): ThemeTokens =>
  normalizeThemeTokens({
    colors: { primary, accent, neutral: 'slate' },
    fonts: { heading, body: 'Noto Sans Thai' },
    radius: 'md',
    button: 'soft',
    density: 'comfortable',
    colorMode: 'light',
    animation: 'soft',
  });

/**
 * The three packs that ship with Lumio, in the shape the wizard reads from the
 * API. Used when no API is configured so the whole flow can be walked through.
 */
export const demoItems: TemplateSummary[] = [
  {
    id: '6f12c9a0-1b34-4c5d-8e6f-7a8b9c0d1e2f',
    name: 'กาแฟบ้านดอย',
    businessType: 'restaurant',
    description: 'คาเฟ่และร้านกาแฟคั่วเอง โทนอบอุ่น',
    styleId: 'soft',
    previewUrl: preview('#8B5E3C', '#D9A05B', 'กาแฟบ้านดอย'),
    tokens: tokens('#8B5E3C', '#D9A05B', 'Prompt'),
    pages: [
      { slug: 'home', title: 'หน้าแรก', type: 'page' },
      { slug: 'menu', title: 'เมนูร้าน', type: 'page' },
      { slug: 'reservation', title: 'จองโต๊ะ', type: 'page' },
      { slug: 'location', title: 'ที่ตั้งร้าน', type: 'page' },
      { slug: 'contact', title: 'ติดต่อเรา', type: 'page' },
    ],
  },
  {
    id: '9a7b6c5d-4e3f-4a2b-9c1d-0e8f7a6b5c4d',
    name: 'คลินิกยิ้มสวย',
    businessType: 'clinic',
    description: 'คลินิกทันตกรรม โทนสะอาด เรียบ',
    styleId: 'minimal',
    previewUrl: preview('#0E7490', '#22D3EE', 'คลินิกยิ้มสวย'),
    tokens: tokens('#0E7490', '#22D3EE', 'Inter'),
    pages: [
      { slug: 'home', title: 'หน้าแรก', type: 'page' },
      { slug: 'services', title: 'บริการและราคา', type: 'page' },
      { slug: 'doctors', title: 'ทีมทันตแพทย์', type: 'page' },
      { slug: 'appointment', title: 'นัดหมาย', type: 'page' },
      { slug: 'contact', title: 'ติดต่อคลินิก', type: 'page' },
    ],
  },
  {
    id: '2d3e4f50-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
    name: 'สตูดิโอแสนดี',
    businessType: 'freelance',
    description: 'พอร์ตโฟลิโอฟรีแลนซ์ โทนเข้ม ตัวอักษรใหญ่',
    styleId: 'bold',
    previewUrl: preview('#4338CA', '#F472B6', 'สตูดิโอแสนดี'),
    tokens: tokens('#4338CA', '#F472B6', 'Plus Jakarta Sans'),
    pages: [
      { slug: 'home', title: 'หน้าแรก', type: 'page' },
      { slug: 'work', title: 'ผลงาน', type: 'page' },
      { slug: 'services', title: 'บริการและขั้นตอน', type: 'page' },
      { slug: 'about', title: 'เกี่ยวกับ', type: 'page' },
      { slug: 'contact', title: 'ติดต่อ', type: 'page' },
    ],
  },
];

/** In-memory wizard backend: the whole 3-minute flow works before the API is up. */
export const createDemoWizardApi = (): WizardApi => {
  let sites: SiteSummary[] = [];
  /** Languages the last created site asked for, so the demo can report progress. */
  let lastExtras: string[] = [];

  return {
    listTemplates: async () => demoItems,
    listSites: async () => sites,

    createSite: async (input: CreateSiteFromTemplateInput): Promise<WizardSiteResult> => {
      if (sites.some((site) => site.subdomain === input.subdomain)) {
        throw new ApiError('conflict', translateNow('demo.subdomainTaken'), 409);
      }

      const template =
        demoItems.find((item) => item.id === input.templateId) ??
        demoItems.find((item) => item.businessType === input.businessType) ??
        demoItems[0];

      if (!template) throw new ApiError('not_found', translateNow('demo.templateNotFound'), 404);

      const site: SiteSummary = {
        id: `demo-site-${sites.length + 1}`,
        name: input.name,
        subdomain: input.subdomain,
        localeDefault: input.localeDefault,
        locales: [input.localeDefault],
        plan: 'free',
        role: 'owner',
        createdAt: new Date().toISOString(),
      };
      sites = [...sites, site];
      lastExtras = input.locales.filter((locale) => locale !== input.localeDefault);

      return {
        siteId: site.id,
        name: site.name,
        subdomain: site.subdomain,
        templateId: template.id,
        pages: template.pages.map((page, index) => ({
          id: `${site.id}-page-${index + 1}`,
          title: page.title,
          slug: page.slug,
          type: page.type,
          status: 'published',
        })),
        published: template.pages.length,
      };
    },

    /** Demo languages finish instantly: the wizard sees the same shape as the API. */
    localeStatus: async (): Promise<SiteLocaleStatus> => ({
      defaultLocale: 'th',
      locales: lastExtras.map((locale) => ({
        locale,
        status: 'done' as const,
        pages: 4,
        done: 4,
        translated: true,
        error: null,
        updatedAt: new Date().toISOString(),
      })),
    }),
  };
};
