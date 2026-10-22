import { z } from 'zod';
import type { ApiLocale } from './api-locale.js';
import type { BlockNode } from './blocks.js';
import { HEALTH_IMPACTS } from './dashboard.js';

/**
 * SEO health for one site (docs/design/14-seo-performance.md 14.1, 05-admin-ia.md
 * "เติบโต › SEO"). Every check is derived from stored data, so the screen can show
 * what is wrong, how many pages it touches, and where to fix it.
 */

export const SEO_ISSUE_KINDS = [
  'not_published',
  'missing_title',
  'missing_description',
  'missing_h1',
  'missing_alt',
  'noindex',
] as const;
export type SeoIssueKind = (typeof SEO_ISSUE_KINDS)[number];

/** Business wording for each check, shared by the API and the admin screen. */
export const SEO_ISSUE_LABELS: Record<SeoIssueKind, string> = {
  not_published: 'ยังไม่มีหน้าเว็บที่เผยแพร่',
  missing_title: 'ยังไม่มีชื่อเรื่องสำหรับค้นหา',
  missing_description: 'ยังไม่มีคำอธิบายหน้า',
  missing_h1: 'หน้ายังไม่มีหัวข้อหลัก',
  missing_alt: 'รูปยังไม่มีคำอธิบายรูป',
  noindex: 'บางหน้าถูกตั้งให้ไม่แสดงในผลค้นหา',
};

export const SEO_ISSUE_LABELS_EN: Record<SeoIssueKind, string> = {
  not_published: 'No published pages yet',
  missing_title: 'No search title yet',
  missing_description: 'No page description yet',
  missing_h1: 'A page has no main heading',
  missing_alt: 'Images have no description',
  noindex: 'Some pages are hidden from search results',
};

export const seoIssueLabel = (kind: SeoIssueKind, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? SEO_ISSUE_LABELS_EN[kind] : SEO_ISSUE_LABELS[kind];

export const seoIssueItemSchema = z.object({
  id: z.string(),
  title: z.string(),
});
export type SeoIssueItem = z.infer<typeof seoIssueItemSchema>;

/** One line of the SEO report: done/not done, how many, and where to go. */
export const seoCheckSchema = z.object({
  kind: z.enum(SEO_ISSUE_KINDS),
  label: z.string(),
  done: z.boolean(),
  count: z.number().int().nonnegative(),
  impact: z.enum(HEALTH_IMPACTS),
  /** Where the admin fixes it. */
  href: z.string(),
  /** A few offending pages/items so the screen can link straight to them. */
  items: z.array(seoIssueItemSchema),
});
export type SeoCheck = z.infer<typeof seoCheckSchema>;

export const seoGrades = ['good', 'ok', 'poor'] as const;
export type SeoGrade = (typeof seoGrades)[number];

export const seoHealthSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: z.enum(seoGrades),
  publishedCount: z.number().int().nonnegative(),
  checks: z.array(seoCheckSchema),
});
export type SeoHealth = z.infer<typeof seoHealthSchema>;

/** A friendly badge for the score, so the screen never shows a bare number. */
export const seoGradeFor = (score: number): SeoGrade => {
  if (score >= 90) return 'good';
  if (score >= 60) return 'ok';
  return 'poor';
};

/** A page the report asks meta text for, with the fields that are still empty. */
export interface SeoMetaCandidate {
  id: string;
  title: string;
  missingTitle: boolean;
  missingDescription: boolean;
}

const META_ISSUES = ['missing_title', 'missing_description'] as const;

/**
 * Pages that miss a search title and/or description, read straight from the SEO
 * report, so the assistant offers to write only the fields that are really empty.
 */
export const seoMetaCandidates = (health: SeoHealth): SeoMetaCandidate[] => {
  const byId = new Map<string, SeoMetaCandidate>();

  for (const kind of META_ISSUES) {
    const check = health.checks.find((entry) => entry.kind === kind);
    if (!check) continue;

    for (const item of check.items) {
      const candidate = byId.get(item.id) ?? {
        id: item.id,
        title: item.title,
        missingTitle: false,
        missingDescription: false,
      };
      if (kind === 'missing_title') candidate.missingTitle = true;
      else candidate.missingDescription = true;
      byId.set(item.id, candidate);
    }
  }

  return [...byId.values()];
};

export const SEO_GRADE_LABELS: Record<SeoGrade, string> = {
  good: 'ดีมาก',
  ok: 'พอใช้',
  poor: 'ควรปรับปรุง',
};

export const SEO_GRADE_LABELS_EN: Record<SeoGrade, string> = {
  good: 'Great',
  ok: 'Fair',
  poor: 'Needs work',
};

export const seoGradeLabel = (grade: SeoGrade, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? SEO_GRADE_LABELS_EN[grade] : SEO_GRADE_LABELS[grade];

/** Blocks that always render an `<h1>` of their own. */
const H1_BLOCKS = new Set(['hero']);

const blockHasHeadingOne = (block: BlockNode): boolean => {
  if (H1_BLOCKS.has(block.type)) return true;
  if (block.type === 'heading' && block.props.level === 'h1') return true;
  return block.children.some(blockHasHeadingOne);
};

/**
 * Whether a page already carries an `<h1>` (SEO wants exactly one per page).
 * Shared by the renderer (fills a fallback title) and the SEO report.
 */
export const blocksHaveHeadingOne = (blocks: BlockNode[]): boolean =>
  blocks.some(blockHasHeadingOne);

/** Reads `seo.title`/`seo.description` defensively: stored JSON may be anything. */
export const hasSeoText = (seo: unknown, key: 'title' | 'description'): boolean => {
  if (seo === null || typeof seo !== 'object') return false;
  const value = (seo as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0;
};

export const isNoindex = (seo: unknown): boolean =>
  seo !== null && typeof seo === 'object' && (seo as Record<string, unknown>).noindex === true;
