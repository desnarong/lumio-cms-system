import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AiProposal } from '@lumio/shared';
import { AiDiffDialog } from './AiDiffDialog.js';

const proposal: AiProposal = {
  id: 'p1',
  action: 'rewrite',
  label: 'ทำให้สั้นลง',
  summary: 'ทำให้สั้นลง 2 ข้อความ',
  provider: 'local',
  changes: [
    { field: 'text', label: 'ข้อความที่ 1', before: 'กาแฟสด อร่อยมากเลยนะ', after: 'กาแฟสดอร่อย' },
    { field: 'title', label: 'ชื่อเรื่อง', before: '', after: 'กาแฟบ้านดอย' },
  ],
};

const render = (overrides: Partial<Parameters<typeof AiDiffDialog>[0]> = {}): string =>
  renderToStaticMarkup(
    <AiDiffDialog
      proposal={proposal}
      onAccept={() => undefined}
      onReject={() => undefined}
      {...overrides}
    />,
  );

describe('AiDiffDialog', () => {
  it('shows every change as before and after, with the requested wording', () => {
    const html = render();

    expect(html).toContain('ทำให้สั้นลง');
    expect(html).toContain('ทำให้สั้นลง 2 ข้อความ');
    expect(html).toContain('กาแฟสด อร่อยมากเลยนะ');
    expect(html).toContain('กาแฟสดอร่อย');
    expect(html).toContain('กาแฟบ้านดอย');
  });

  it('offers exactly the two decisions and never applies anything by itself', () => {
    const html = render();

    expect(html).toContain('ยกเลิก');
    expect(html).toContain('นำไปใช้');
    expect(html).toContain('ระบบจะยังไม่แก้เว็บจนกว่าคุณจะกด');
    expect(html).toContain('ผู้ช่วยในเครื่อง');
  });

  it('hides the before line when there was nothing there yet', () => {
    const html = render({
      proposal: {
        ...proposal,
        changes: [{ field: 'title', label: 'ชื่อเรื่อง', before: '', after: 'กาแฟบ้านดอย' }],
      },
    });

    expect(html).not.toContain('ai-diff__before');
    expect(html).toContain('ai-diff__after');
  });

  it('shows a whole-site design change as a before/after diff too', () => {
    const html = render({
      proposal: {
        id: 'c1',
        action: 'site-command',
        label: 'สั่งงานทั้งเว็บ',
        summary: 'ปรับสีและสไตล์ให้ทุกส่วนของเว็บพร้อมกัน',
        provider: 'local',
        changes: [
          {
            field: 'colors.primary',
            label: 'สีหลัก (ปุ่มและลิงก์)',
            before: '#4F46E5',
            after: '#C2410C',
          },
        ],
        patch: { colors: { primary: '#C2410C' } },
        inversePatch: { colors: { primary: '#4F46E5' } },
      },
    });

    expect(html).toContain('สั่งงานทั้งเว็บ');
    expect(html).toContain('#4F46E5');
    expect(html).toContain('#C2410C');
  });

  it('renders nothing without a proposal', () => {
    expect(render({ proposal: null })).toBe('');
  });

  it('reports the engine that answered', () => {
    expect(render({ proposal: { ...proposal, provider: 'openai' } })).toContain('ผู้ให้บริการ AI');
  });
});
