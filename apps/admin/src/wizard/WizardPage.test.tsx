import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@lumio/ui';
import { createDemoAiApi } from '../ai/demo.js';
import { WizardPage } from './WizardPage.js';
import { createDemoWizardApi } from './demo.js';

const render = (): string =>
  renderToStaticMarkup(
    <ToastProvider>
      <WizardPage api={createDemoWizardApi()} onCreated={() => undefined} />
    </ToastProvider>,
  );

const renderWithAi = (): string =>
  renderToStaticMarkup(
    <ToastProvider>
      <WizardPage api={createDemoWizardApi()} ai={createDemoAiApi()} onCreated={() => undefined} />
    </ToastProvider>,
  );

describe('WizardPage', () => {
  it('opens on the business-type question with the five steps listed', () => {
    const html = render();

    expect(html).toContain('ธุรกิจของคุณคืออะไร?');
    expect(html).toContain('ขั้นที่ 1 จาก 5');
    expect(html.match(/wizard-steps__item/g)).toHaveLength(5);
  });

  it('offers every business type the templates cover', () => {
    const html = render();

    expect(html).toContain('ร้านอาหาร / คาเฟ่');
    expect(html).toContain('คลินิก / สุขภาพ');
    expect(html).toContain('ฟรีแลนซ์ / พอร์ตโฟลิโอ');
    expect(html).toContain('ธุรกิจอื่น ๆ');
  });

  it('keeps exactly one primary button per step', () => {
    expect(render().match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('uses business language instead of technical jargon', () => {
    const html = render();
    for (const jargon of ['Subdomain', 'Template', 'Slug', 'Token', 'Deploy']) {
      expect(html).not.toContain(jargon);
    }
  });

  it('offers the AI draft only when the assistant is available', () => {
    expect(renderWithAi()).toContain('ให้ผู้ช่วยร่างให้');
    expect(render()).not.toContain('ให้ผู้ช่วยร่างให้');
  });
});

const renderColourStep = (withLogoPalette: boolean): string =>
  renderToStaticMarkup(
    <ToastProvider>
      <WizardPage
        api={createDemoWizardApi()}
        initialStepId="color"
        initialAnswers={{ logoMediaId: 'demo-media-logo' }}
        {...(withLogoPalette
          ? {
              logoPalette: async () => ({
                primary: '#1D4ED8',
                accent: '#F97316',
                swatches: [],
                fromLogo: true,
              }),
            }
          : {})}
        onCreated={() => undefined}
      />
    </ToastProvider>,
  );

describe('WizardPage logo palette', () => {
  it('offers the logo colours once a logo was uploaded', () => {
    const html = renderColourStep(true);

    expect(html).toContain('ใช้สีจากโลโก้');
    expect(html).toContain('ดึงสีหลักจากโลโก้ที่อัปโหลดไว้');
    expect(html).toContain('หรือเลือกสีเอง');
  });

  it('hides the offer when the palette reader is unavailable', () => {
    const html = renderColourStep(false);

    expect(html).not.toContain('ดึงสีหลักจากโลโก้ที่อัปโหลดไว้');
    expect(html).toContain('หรือเลือกสีเอง');
  });
});

describe('WizardPage languages', () => {
  it('offers the extra language on the last step', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <WizardPage
          api={createDemoWizardApi()}
          initialStepId="create"
          initialAnswers={{ name: 'ร้านของฉัน', subdomain: 'my-shop' }}
          onCreated={() => undefined}
        />
      </ToastProvider>,
    );

    expect(html).toContain('เพิ่มภาษาอื่น');
    expect(html).toContain('อังกฤษ (English)');
    expect(html).toContain('ภาษา:');
    expect(html).toContain('ไทย');
  });
});

describe('WizardPage summary', () => {
  it('recaps the answers before building the site', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <WizardPage
          api={createDemoWizardApi()}
          initialStepId="create"
          initialAnswers={{ businessType: 'restaurant', name: 'ร้านของฉัน', subdomain: 'my-shop' }}
          onCreated={() => undefined}
        />
      </ToastProvider>,
    );

    expect(html).toContain('พร้อมสร้างเว็บแล้ว');
    expect(html).toContain('ขั้นที่ 5 จาก 5');
    expect(html).toContain('ร้านของฉัน');
    expect(html).toContain('my-shop');
    expect(html).toContain('ร้านอาหาร / คาเฟ่');
    expect(html).toContain('สร้างเว็บให้เลย!');
    // Templates load in an effect, so the preview image is not part of the
    // first paint; the summary still shows what it will use.
    expect(html).toContain('เทมเพลต:');
  });

  it('keeps exactly one primary button on the last step', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <WizardPage
          api={createDemoWizardApi()}
          initialStepId="create"
          initialAnswers={{ name: 'ร้านของฉัน', subdomain: 'my-shop' }}
          onCreated={() => undefined}
        />
      </ToastProvider>,
    );

    expect(html.match(/ui-button--primary/g)).toHaveLength(1);
    expect(html).toContain('ย้อนกลับ');
  });
});
