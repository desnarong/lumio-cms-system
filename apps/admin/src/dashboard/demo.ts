import {
  SITE_CHECKLIST_LABELS,
  siteChecklistLabel,
  type DashboardSummary,
  type SiteChecklistKey,
} from '@lumio/shared';
import { uiLocaleNow } from '@lumio/ui';
import { DEMO_CONTENT_ID } from '../editor/demo.js';
import type { DashboardApi } from './api.js';

const CHECKLIST_HREFS: Record<SiteChecklistKey, string> = {
  site_named: '/settings/general',
  style_chosen: '/design/style',
  home_text_edited: `/content/page/${DEMO_CONTENT_ID}`,
  image_uploaded: '/content/media',
  domain_connected: '/settings/domain',
  first_publish: '/content/page',
};

const DONE: SiteChecklistKey[] = ['site_named', 'style_chosen', 'image_uploaded', 'first_publish'];

const summary = (dismissed: boolean): DashboardSummary => {
  const locale = uiLocaleNow();
  const en = locale === 'en';
  const keys = Object.keys(SITE_CHECKLIST_LABELS) as SiteChecklistKey[];
  const items = keys.map((key) => ({
    key,
    label: siteChecklistLabel(key, locale),
    done: DONE.includes(key),
    href: CHECKLIST_HREFS[key],
  }));

  return {
    site: {
      id: 'demo-site-1',
      name: 'กาแฟบ้านดอย',
      subdomain: 'baandoi',
      url: 'https://baandoi.lumio.app',
      homeContentId: DEMO_CONTENT_ID,
    },
    stats: {
      visitors: { value: 1284, previous: 1146, changePercent: 12 },
      submissions: { value: 7, previous: 7, changePercent: 0 },
      subscribers: { value: 32, previous: 28, changePercent: 14.3 },
    },
    health: {
      score: 86,
      issues: [
        {
          id: 'seo_description',
          message: en ? 'Page "Services" has no description' : 'หน้า "บริการ" ยังไม่มีคำอธิบายหน้า',
          impact: 'medium',
          href: '/content/page',
        },
        {
          id: 'media_alt',
          message: en ? '3 images have no description' : 'รูป 3 รูปยังไม่มีคำอธิบายรูป',
          impact: 'medium',
          href: '/content/media',
        },
        {
          id: 'no_domain',
          message: en
            ? 'Your own domain is not connected yet, the site is still on a temporary address'
            : 'ยังไม่ได้เชื่อมโดเมนของตัวเอง เว็บยังอยู่บนที่อยู่ชั่วคราว',
          impact: 'low',
          href: '/settings/domain',
        },
      ],
    },
    checklist: {
      items,
      doneCount: items.filter((item) => item.done).length,
      total: items.length,
      complete: false,
      dismissed,
    },
  };
};

/** Demo dashboard so the shell works before the API is configured. */
export const createDemoDashboardApi = (): DashboardApi => {
  let dismissed = false;

  return {
    getSummary: async () => summary(dismissed),
    setChecklistDismissed: async (next) => {
      dismissed = next;
    },
  };
};
