import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@lumio/ui';
import { createDemoAiApi } from '../ai/demo.js';
import { EditorPage } from './EditorPage.js';
import { DEMO_CONTENT_ID, createDemoContent, createDemoContentApi } from './demo.js';
import { createDemoSectionTemplateApi } from './sections.js';

const render = (): string =>
  renderToStaticMarkup(
    <ToastProvider>
      <EditorPage
        api={createDemoContentApi()}
        contentId={DEMO_CONTENT_ID}
        initialContent={createDemoContent()}
        sectionsApi={createDemoSectionTemplateApi()}
      />
    </ToastProvider>,
  );

/** The chrome, without the site content rendered inside the page frame. */
const toolbarMarkup = (html: string): string =>
  html.slice(html.indexOf('editor-toolbar'), html.indexOf('editor-body'));

describe('EditorPage', () => {
  it('opens the edit-on-page editor on the page title', () => {
    const html = render();
    expect(html).toContain('หน้าแรก');
    expect(html).toContain('พื้นที่แก้ไขหน้าเว็บ');
  });

  it('keeps exactly one primary button in the editor chrome', () => {
    expect(toolbarMarkup(render()).match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('offers the toolbar from the wireframe: devices, undo, mode and publish', () => {
    const html = render();
    expect(html).toContain('ดูแบบมือถือ');
    expect(html).toContain('ดูแบบแท็บเล็ต');
    expect(html).toContain('ดูแบบเดสก์ท็อป');
    expect(html).toContain('เลิกทำ');
    expect(html).toContain('ทำซ้ำ');
    expect(html).toContain('แก้ไข');
    expect(html).toContain('ดีไซน์');
    expect(html).toContain('เผยแพร่');
  });

  it('shows the draft status and renders the page blocks', () => {
    const html = render();
    expect(html).toContain('● ร่าง');
    expect(html.match(/data-block-id=/g)).toHaveLength(3);
  });

  it('invites the user to add a section and to save one as a template', () => {
    const html = render();
    expect(html).toContain('เพิ่มส่วนใหม่');
    expect(html).toContain('บันทึกเป็นเทมเพลต');
  });

  it('offers sign out only when the shell provides it', () => {
    const withoutSignOut = render();
    expect(withoutSignOut).not.toContain('ออกจากระบบ');

    const withSignOut = renderToStaticMarkup(
      <ToastProvider>
        <EditorPage
          api={createDemoContentApi()}
          contentId={DEMO_CONTENT_ID}
          initialContent={createDemoContent()}
          onSignOut={() => undefined}
        />
      </ToastProvider>,
    );
    expect(withSignOut).toContain('ออกจากระบบ');
  });

  it('uses business language instead of technical jargon', () => {
    const html = render();
    for (const jargon of ['Post type', 'Slug', 'Permalink', 'Widget', 'Shortcode', 'Taxonomy']) {
      expect(html).not.toContain(jargon);
    }
  });

  it('shows the AI assistant only when the shell provides one', () => {
    expect(render()).not.toContain('ผู้ช่วย AI');

    const withAi = renderToStaticMarkup(
      <ToastProvider>
        <EditorPage
          api={createDemoContentApi()}
          contentId={DEMO_CONTENT_ID}
          initialContent={createDemoContent()}
          ai={createDemoAiApi()}
        />
      </ToastProvider>,
    );
    expect(withAi).toContain('ผู้ช่วย AI');
  });
});
