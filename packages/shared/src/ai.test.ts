import { describe, expect, it } from 'vitest';
import {
  AI_MAX_TEXTS,
  aiProposalSummary,
  aiQuotaForPlan,
  aiQuotaMessage,
  aiQuotaPercent,
  aiRewriteInputSchema,
  aiUsageFor,
  blockCommandFromInstruction,
  collectBodyTexts,
  collectHeadingTexts,
  collapseWhitespace,
  isAiQuotaExhausted,
  isAiQuotaLow,
  isAiRewriteStyle,
  sentenceChunks,
  truncateText,
  type BlockNode,
} from './index.js';

const block = (type: string, props: Record<string, unknown>, children: BlockNode[] = []): BlockNode =>
  ({
    id: `${type}-1`,
    type,
    version: 1,
    props,
    style: {
      paddingY: 'md',
      paddingX: 'md',
      background: 'none',
      visibility: { mobile: true, tablet: true, desktop: true },
      animation: 'none',
    },
    children,
  }) as BlockNode;

describe('ai quota', () => {
  it('reads the AI allowance from the plan table', () => {
    expect(aiQuotaForPlan('free')).toBeNull();
    expect(aiQuotaForPlan('starter')).toBeNull();
    expect(aiQuotaForPlan('pro')).toBe(200);
    expect(aiQuotaForPlan('business')).toBe(1000);
  });

  it('falls back to the free plan for an unknown plan', () => {
    expect(aiQuotaForPlan('mystery')).toBeNull();
  });

  it('counts what is left and reports exhaustion', () => {
    const usage = aiUsageFor(199, 200);
    expect(usage).toEqual({ used: 199, limit: 200, remaining: 1 });
    expect(isAiQuotaExhausted(usage)).toBe(false);
    expect(isAiQuotaLow(usage)).toBe(true);
    expect(aiQuotaPercent(usage)).toBe(100);
    expect(isAiQuotaExhausted(aiUsageFor(200, 200))).toBe(true);
  });

  it('treats an unlimited plan as never exhausted', () => {
    const usage = aiUsageFor(5000, null);
    expect(usage.remaining).toBeNull();
    expect(isAiQuotaExhausted(usage)).toBe(false);
    expect(isAiQuotaLow(usage)).toBe(false);
    expect(aiQuotaPercent(usage)).toBe(0);
  });

  it('phrases the remaining allowance in business wording', () => {
    expect(aiQuotaMessage(aiUsageFor(3, 200))).toBe('เดือนนี้ใช้ไป 3 จาก 200 ครั้ง');
    expect(aiQuotaMessage(aiUsageFor(3, null))).toBe('ใช้ AI ได้ไม่จำกัด');
  });
});

describe('aiRewriteInputSchema', () => {
  it('accepts a batch of texts with a known style', () => {
    const input = aiRewriteInputSchema.parse({
      texts: ['สวัสดี', 'ยินดีต้อนรับ'],
      style: 'shorter',
    });
    expect(input.texts).toHaveLength(2);
    expect(input.context).toBeUndefined();
  });

  it('rejects an unknown style, empty text and too many texts', () => {
    expect(aiRewriteInputSchema.safeParse({ texts: ['a'], style: 'poetic' }).success).toBe(false);
    expect(aiRewriteInputSchema.safeParse({ texts: [''], style: 'shorter' }).success).toBe(false);
    expect(
      aiRewriteInputSchema.safeParse({
        texts: Array.from({ length: AI_MAX_TEXTS + 1 }, (_, index) => `ข้อ ${index}`),
        style: 'shorter',
      }).success,
    ).toBe(false);
  });

  it('knows its own style list', () => {
    expect(isAiRewriteStyle('friendly')).toBe(true);
    expect(isAiRewriteStyle('shouting')).toBe(false);
  });
});

describe('text helpers', () => {
  it('collapses runs of whitespace', () => {
    expect(collapseWhitespace('  กาแฟ   คั่วสด \n ทุกสัปดาห์ ')).toBe('กาแฟ คั่วสด ทุกสัปดาห์');
  });

  it('truncates on a word boundary when there is one', () => {
    expect(truncateText('fresh coffee roasted every week for you', 20)).toBe('fresh coffee…');
  });

  it('keeps short text untouched and cuts long Thai runs', () => {
    expect(truncateText('สั้นดี', 20)).toBe('สั้นดี');
    expect(truncateText('ก'.repeat(30), 10)).toBe(`${'ก'.repeat(10)}…`);
  });

  it('splits long text into readable chunks', () => {
    expect(sentenceChunks('one two three four five six', 11)).toEqual(['one two', 'three four', 'five six']);
    expect(sentenceChunks('สั้น', 11)).toEqual(['สั้น']);
    expect(sentenceChunks('   ', 11)).toEqual([]);
  });
});

describe('block text collection', () => {
  const page: BlockNode[] = [
    block('hero', { heading: 'กาแฟคั่วสดจากดอย', subheading: 'คั่วใหม่ทุกสัปดาห์' }),
    block('features', { heading: 'ทำไมลูกค้าถึงเลือกเรา' }),
    block('paragraph', { text: 'เราเลือกเมล็ดจากสวนทางภาคเหนือ' }),
    block('heading', { text: 'หัวข้อซ้อนใน', level: 'h2' }, [block('paragraph', { text: 'ข้อความใน' })]),
  ];

  it('collects headings in reading order, including nested ones', () => {
    expect(collectHeadingTexts(page)).toEqual([
      'กาแฟคั่วสดจากดอย',
      'ทำไมลูกค้าถึงเลือกเรา',
      'หัวข้อซ้อนใน',
    ]);
    expect(collectHeadingTexts(page, 1)).toEqual(['กาแฟคั่วสดจากดอย']);
  });

  it('collects body copy for a description draft', () => {
    expect(collectBodyTexts(page)).toEqual([
      'คั่วใหม่ทุกสัปดาห์',
      'เราเลือกเมล็ดจากสวนทางภาคเหนือ',
      'ข้อความใน',
    ]);
  });

  it('ignores blocks without usable text', () => {
    expect(collectHeadingTexts([block('image', { caption: '' })])).toEqual([]);
  });
});

describe('aiProposalSummary', () => {
  it('describes the action in business wording', () => {
    expect(aiProposalSummary('rewrite', 2, 'ทำให้สั้นลง')).toBe('ทำให้สั้นลง 2 ข้อความ');
    expect(aiProposalSummary('rewrite', 1)).toBe('ปรับข้อความ 1 จุด');
    expect(aiProposalSummary('translate', 3)).toBe('เตรียมคำแปล 3 ข้อความ');
    expect(aiProposalSummary('alt-text', 1)).toBe('คำอธิบายรูปที่ผู้ช่วยคิดให้');
    expect(aiProposalSummary('seo', 2)).toBe('ชื่อเรื่องและคำอธิบายหน้าที่ผู้ช่วยคิดให้');
  });
});

describe('blockCommandFromInstruction', () => {
  const texts = [
    { path: 'props.heading', label: 'หัวข้อหลัก', value: 'กาแฟคั่วสดจากดอยทุกสัปดาห์! ส่งตรงถึงบ้านคุณพร้อมคำแนะนำการชงที่บ้าน' },
    { path: 'props.subheading', label: 'คำอธิบาย', value: 'ส่งตรงถึงบ้านคุณ' },
  ];

  it('shortens, formalises and rewrites the field the instruction mentions', () => {
    expect(blockCommandFromInstruction('ทำให้หัวข้อหลักสั้นลง', texts)?.[0]?.path).toBe(
      'props.heading',
    );
    const formal = blockCommandFromInstruction('ทำให้เป็นทางการขึ้น', texts)?.[0];
    expect(formal?.after).not.toContain('!');
    expect(blockCommandFromInstruction('เปลี่ยนเป็น “คั่วใหม่ทุกวัน”', texts)?.[0]?.after).toBe(
      'คั่วใหม่ทุกวัน',
    );
  });

  it('answers null when the command means nothing to it', () => {
    expect(blockCommandFromInstruction('ช่วยอะไรสักอย่าง', texts)).toBeNull();
    expect(blockCommandFromInstruction('ทำให้สั้นลง', [])).toBeNull();
  });
});
