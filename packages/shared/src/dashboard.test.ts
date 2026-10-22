import { describe, expect, it } from 'vitest';
import {
  SITE_CHECKLIST_KEYS,
  SITE_CHECKLIST_LABELS,
  checklistStateSchema,
  dashboardSummarySchema,
  updateChecklistInputSchema,
} from './dashboard.js';
import { addDomainInputSchema, isSslStatus, memberSummarySchema } from './site.js';
import { GLOBAL_BLOCK_KINDS, globalBlocksSchema, updateGlobalBlockInputSchema } from './global-blocks.js';
import { updateSectionTemplateInputSchema } from './section-template.js';

describe('checklist definitions', () => {
  it('has exactly the six onboarding steps with Thai labels', () => {
    expect(SITE_CHECKLIST_KEYS).toHaveLength(6);
    for (const key of SITE_CHECKLIST_KEYS) {
      expect(SITE_CHECKLIST_LABELS[key].length).toBeGreaterThan(0);
    }
    expect(SITE_CHECKLIST_LABELS.domain_connected).toBe('เชื่อมโดเมน');
  });

  it('reads a stored dismissal and defaults to shown', () => {
    expect(checklistStateSchema.parse({ dismissed: true }).dismissed).toBe(true);
    expect(checklistStateSchema.parse({}).dismissed).toBe(false);
  });

  it('only accepts a boolean for the dismissal', () => {
    expect(updateChecklistInputSchema.safeParse({ dismissed: 'yes' }).success).toBe(false);
    expect(updateChecklistInputSchema.safeParse({ dismissed: true }).success).toBe(true);
  });
});

describe('dashboardSummarySchema', () => {
  it('accepts a metric with no baseline', () => {
    const parsed = dashboardSummarySchema.parse({
      site: { id: 's1', name: 'กาแฟบ้านดอย', subdomain: 'baandoi', url: 'https://x', homeContentId: null },
      stats: {
        visitors: { value: 0, previous: 0, changePercent: null },
        submissions: { value: 1, previous: 0, changePercent: null },
        subscribers: { value: 0, previous: 2, changePercent: -100 },
      },
      health: { score: 80, issues: [] },
      checklist: { items: [], doneCount: 0, total: 6, complete: false, dismissed: false },
    });

    expect(parsed.stats.visitors.changePercent).toBeNull();
    expect(parsed.site.homeContentId).toBeNull();
  });

  it('keeps the health score inside 0-100', () => {
    const base = {
      site: { id: 's1', name: 'x', subdomain: 'x', url: 'https://x', homeContentId: null },
      stats: {
        visitors: { value: 0, previous: 0, changePercent: null },
        submissions: { value: 0, previous: 0, changePercent: null },
        subscribers: { value: 0, previous: 0, changePercent: null },
      },
      checklist: { items: [], doneCount: 0, total: 6, complete: false, dismissed: false },
    };

    expect(dashboardSummarySchema.safeParse({ ...base, health: { score: 101, issues: [] } }).success).toBe(false);
    expect(dashboardSummarySchema.safeParse({ ...base, health: { score: 100, issues: [] } }).success).toBe(true);
  });
});

describe('global block schemas', () => {
  it('knows the two kinds', () => {
    expect(GLOBAL_BLOCK_KINDS).toEqual(['header', 'footer']);
  });

  it('answers both kinds at once and accepts an update per kind', () => {
    expect(globalBlocksSchema.parse({ header: [], footer: [] })).toEqual({ header: [], footer: [] });
    expect(updateGlobalBlockInputSchema.parse({ blocks: [] })).toEqual({ blocks: [] });
  });
});

describe('domain and member schemas', () => {
  it('normalises the hostname to lowercase and rejects nonsense', () => {
    expect(addDomainInputSchema.parse({ hostname: 'Baandoi.COM' }).hostname).toBe('baandoi.com');
    expect(addDomainInputSchema.safeParse({ hostname: 'not a domain' }).success).toBe(false);
    expect(addDomainInputSchema.safeParse({ hostname: 'no-dot' }).success).toBe(false);
  });

  it('guards the ssl status', () => {
    expect(isSslStatus('active')).toBe(true);
    expect(isSslStatus('broken')).toBe(false);
  });

  it('describes a teammate row', () => {
    const parsed = memberSummarySchema.parse({
      userId: 'u1',
      email: 'a@b.com',
      name: null,
      avatarUrl: null,
      role: 'editor',
      joinedAt: '2026-10-20T00:00:00.000Z',
    });
    expect(parsed.role).toBe('editor');
  });
});

describe('section template rename', () => {
  it('requires a non-empty name', () => {
    expect(updateSectionTemplateInputSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(updateSectionTemplateInputSchema.parse({ name: ' ฮีโร่ ' }).name).toBe('ฮีโร่');
  });
});
