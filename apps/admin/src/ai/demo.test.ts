import { describe, expect, it } from 'vitest';
import { createDemoAiApi } from './demo.js';

describe('createDemoAiApi', () => {
  it('starts with the demo quota and counts every accepted action', async () => {
    const api = createDemoAiApi();
    const before = await api.status();

    expect(before.enabled).toBe(true);
    expect(before.planLabel).toBe('โปร');
    expect(before.provider).toBe('demo');
    expect(before.usage.limit).toBe(200);

    const result = await api.rewrite({ texts: ['กาแฟสด อร่อยมาก'], style: 'shorter' });
    expect(result.usage.used).toBe(before.usage.used + 1);
    expect((await api.status()).usage.used).toBe(before.usage.used + 1);
  });

  it('proposes a rewrite with the chosen style and keeps the original as context', async () => {
    const result = await createDemoAiApi().rewrite({
      texts: ['กาแฟสด อร่อยมาก!!'],
      style: 'formal',
    });

    expect(result.proposal.label).toBe('ทางการขึ้น');
    expect(result.proposal.changes[0]).toMatchObject({
      field: 'text',
      before: 'กาแฟสด อร่อยมาก!!',
      after: 'กาแฟสด อร่อยมาก',
    });
  });

  it('marks translated text so a demo is never mistaken for a real translation', async () => {
    const result = await createDemoAiApi().translate({
      texts: ['สวัสดี'],
      targetLocale: 'en',
    });

    expect(result.proposal.label).toBe('แปลเป็นอังกฤษ');
    expect(result.proposal.changes[0]?.after).toBe('(en) สวัสดี');
  });

  it('drafts alt text from the context it was given', async () => {
    const result = await createDemoAiApi().altText({ mediaId: 'm1', context: 'โฟลเดอร์ hero' });
    expect(result.proposal.changes[0]?.after).toContain('hero');
  });

  it('drafts a page title and description using the keyword', async () => {
    const result = await createDemoAiApi().seo({ pageId: 'p1', keyword: 'กาแฟดอย' });
    const change = (field: string) =>
      result.proposal.changes.find((entry) => entry.field === field)?.after ?? '';

    expect(change('title')).toContain('กาแฟดอย');
    expect(change('description')).toContain('กาแฟดอย');
  });

  it('edits the selected block from one sentence', async () => {
    const result = await createDemoAiApi().blockCommand({
      pageId: 'p1',
      instruction: 'ทำให้สั้นลง',
      texts: [
        {
          path: 'props.heading',
          label: 'หัวข้อหลัก',
          value: 'กาแฟคั่วสดจากดอยทุกสัปดาห์ ส่งตรงถึงบ้านคุณพร้อมคำแนะนำการชงที่บ้าน',
        },
      ],
    });

    expect(result.proposal.action).toBe('block-command');
    expect(result.proposal.changes[0]?.path).toBe('props.heading');
    expect(result.proposal.changes[0]?.after.length).toBeLessThan(
      result.proposal.changes[0]?.before.length ?? 0,
    );
  });

  it('turns a whole-site command into a design-token diff with an undo patch', async () => {
    const api = createDemoAiApi();
    const result = await api.siteCommand({ instruction: 'เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม' });

    expect(result.proposal.action).toBe('site-command');
    expect(result.proposal.changes[0]?.field).toBe('colors.primary');
    expect(result.proposal.patch.colors?.primary).toMatch(/^#[0-9A-F]{6}$/);
    expect(result.proposal.inversePatch.colors?.primary).toBeTruthy();
  });

  it('reports a command it cannot read in business wording', async () => {
    const api = createDemoAiApi();
    await expect(api.siteCommand({ instruction: 'สวัสดีตอนเช้า' })).rejects.toThrow(
      /ยังไม่เข้าใจคำสั่งนี้/,
    );
  });

  it('keeps each proposal and usage independent per call', async () => {
    const api = createDemoAiApi();
    const first = await api.rewrite({ texts: ['หนึ่ง'], style: 'shorter' });
    const second = await api.rewrite({ texts: ['สอง'], style: 'shorter' });

    expect(first.proposal.id).not.toBe(second.proposal.id);
    expect(second.usage.used).toBe(first.usage.used + 1);
  });
});
