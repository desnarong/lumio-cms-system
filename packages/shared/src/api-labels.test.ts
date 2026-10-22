import { describe, expect, it } from 'vitest';
import { APP_CATALOG, localizeCatalogApp, appCategoryLabel, appPermissionLabel } from './app.js';
import {
  formatPlanPrice,
  invoiceStatusLabel,
  planFeatures,
  planLabel,
  PLAN_DEFINITIONS,
} from './billing.js';
import { deviceLabel } from './analytics.js';
import { siteChecklistLabel } from './dashboard.js';
import { seoIssueLabel } from './seo-health.js';
import { aiFieldLabel, aiProposalSummary, aiRewriteLabel, aiTextChangeLabel } from './ai.js';

describe('labels the API sends to the admin', () => {
  it('answers plan names and features in the requested language', () => {
    expect(planLabel('pro')).toBe('โปร');
    expect(planLabel('pro', 'en')).toBe('Pro');
    expect(planFeatures('free', 'en')).toEqual(['Free web address', '3 pages', 'Lumio logo badge']);
    expect(planFeatures('free')).toEqual(PLAN_DEFINITIONS[0]?.features);
  });

  it('formats prices and invoice statuses per language', () => {
    expect(formatPlanPrice(499)).toBe('฿499 / เดือน');
    expect(formatPlanPrice(499, 'en')).toBe('฿499 / month');
    expect(formatPlanPrice(null, 'en')).toBe('Contact sales');
    expect(invoiceStatusLabel('pending', 'en')).toBe('Awaiting payment');
  });

  it('translates the SEO checks and the checklist', () => {
    expect(seoIssueLabel('missing_alt')).toBe('รูปยังไม่มีคำอธิบายรูป');
    expect(seoIssueLabel('missing_alt', 'en')).toBe('Images have no description');
    expect(siteChecklistLabel('domain_connected', 'en')).toBe('Connect a domain');
  });

  it('translates the App store and its scopes', () => {
    const app = APP_CATALOG[0]!;
    expect(localizeCatalogApp(app).name).toBe(app.name);
    expect(localizeCatalogApp(app, 'en').name).toBe('SEO helper');
    expect(localizeCatalogApp(app, 'en').category).toBe(app.category);
    expect(appCategoryLabel('marketing', 'en')).toBe('Marketing');
    expect(appPermissionLabel('analytics:read', 'en')).toBe('Read visitor analytics');
  });

  it('translates analytics device labels', () => {
    expect(deviceLabel('mobile')).toBe('มือถือ');
    expect(deviceLabel('mobile', 'en')).toBe('Mobile');
    expect(deviceLabel(null, 'en')).toBe('Unknown device');
  });

  it('translates the assistant proposal wording', () => {
    expect(aiRewriteLabel('shorter', 'en')).toBe('Shorter');
    expect(aiTextChangeLabel(0, 1, 'en')).toBe('Selected text');
    expect(aiTextChangeLabel(1, 2, 'en')).toBe('Text 2');
    expect(aiFieldLabel('seoTitle', 'en')).toBe('Search title');
    expect(aiProposalSummary('seo', 2, null, 'en')).toBe(
      'Search title and page description from the assistant',
    );
  });
});
