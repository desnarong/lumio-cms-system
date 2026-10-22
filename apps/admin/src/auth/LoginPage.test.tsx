import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TwoFactorForm } from './LoginPage.js';

const render = (code = '', busy = false): string =>
  renderToStaticMarkup(
    <TwoFactorForm
      code={code}
      busy={busy}
      error={null}
      onCodeChange={vi.fn()}
      onSubmit={vi.fn()}
      onBack={vi.fn()}
    />,
  );

describe('TwoFactorForm', () => {
  it('asks for the code in business wording', () => {
    const html = render('123456');

    expect(html).toContain('ยืนยันตัวตนขั้นที่สอง');
    expect(html).toContain('รหัสยืนยัน');
    expect(html).toContain('รหัสเปลี่ยนทุก 30 วินาที');
    expect(html).toContain('ยืนยันและเข้าสู่ระบบ');
    expect(html).toContain('ย้อนกลับ');
  });

  it('keeps the submit disabled until a code was typed', () => {
    expect(render('')).toContain('disabled=""');
    expect(render('123456')).not.toContain('disabled=""');
  });

  it('shows why a code was refused and locks the form while busy', () => {
    const html = renderToStaticMarkup(
      <TwoFactorForm
        code="123456"
        busy
        error="รหัสไม่ถูกต้อง ลองอีกครั้ง"
        onCodeChange={vi.fn()}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(html).toContain('รหัสไม่ถูกต้อง ลองอีกครั้ง');
    expect(html).toContain('กำลังเข้าสู่ระบบ…');
  });
});
