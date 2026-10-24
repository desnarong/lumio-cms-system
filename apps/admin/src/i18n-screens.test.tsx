import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider, ToastProvider } from '@lumio/ui';
import type {
  AnalyticsSummary,
  FormSummary,
  MediaItem,
  SeoHealth,
  SiteSummary,
  SubscriberList,
} from '@lumio/shared';
import { AiDiffDialog } from './ai/AiDiffDialog.js';
import { createDemoAiApi } from './ai/demo.js';
import { LoginPage } from './auth/LoginPage.js';
import type { AuthApi } from './auth/api.js';
import { DEMO_CONTENT_ID, createDemoContent, createDemoContentApi } from './editor/demo.js';
import { EditorPage } from './editor/EditorPage.js';
import { createDemoSectionTemplateApi } from './editor/sections.js';
import { VersionHistoryPanel } from './editor/VersionHistoryPanel.js';
import type { ContentApi } from './editor/api.js';
import { FormEditorDialog } from './forms/FormEditorDialog.js';
import { FormsView } from './forms/FormsPage.js';
import type { FormsController } from './forms/useForms.js';
import { SeoView } from './growth/SeoPage.js';
import { AnalyticsView } from './growth/AnalyticsPage.js';
import { AppsView } from './growth/AppsPage.js';
import { NewsletterView } from './growth/NewsletterPage.js';
import { MediaLibraryBody } from './media/MediaLibraryBody.js';
import { DesignPage } from './design/DesignPage.js';
import type { DesignApi } from './design/api.js';
import { GeneralView, TeamView } from './settings/SettingsPage.js';
import { WizardPage } from './wizard/WizardPage.js';
import { createDemoWizardApi } from './wizard/demo.js';

/** Renders one screen in English, the way the language switch does. */
const english = (node: JSX.Element): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="en">
      <ToastProvider>{node}</ToastProvider>
    </MessagesProvider>,
  );

const site = (): SiteSummary => ({
  id: 'site-1',
  name: 'Ban Doi Coffee',
  subdomain: 'baandoi',
  plan: 'pro',
  role: 'owner',
  locales: ['th', 'en'],
  localeDefault: 'th',
  createdAt: '2026-10-01T00:00:00.000Z',
  logoUrl: null,
  faviconUrl: null,
});

const media = (): MediaItem => ({
  id: 'media-1',
  url: 'data:image/svg+xml;utf8,<svg/>',
  srcSet: null,
  filename: 'hero.jpg',
  mime: 'image/jpeg',
  sizeBytes: 2048,
  width: 1600,
  height: 900,
  alt: 'Shop front',
  folder: 'hero',
  focalPoint: null,
  variants: [],
  status: 'ready',
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
});

describe('admin screens in English', () => {
  it('signs in with English labels', () => {
    const html = english(
      <LoginPage api={{} as AuthApi} onSignedIn={vi.fn()} hint="Demo account" />,
    );

    expect(html).toContain('>Sign in<');
    expect(html).toContain('Password');
    expect(html).toContain('Email');
  });

  it('edits a page in English, side panel included', () => {
    const html = english(
      <EditorPage
        api={createDemoContentApi()}
        contentId={DEMO_CONTENT_ID}
        initialContent={createDemoContent()}
        sectionsApi={createDemoSectionTemplateApi()}
      />,
    );

    expect(html).toContain('Publish');
    expect(html).toContain('Add a section');
    expect(html).toContain('Page editing area');
  });

  it('shows the version history drawer in English', () => {
    const api = { listVersions: vi.fn().mockResolvedValue([]) } as unknown as ContentApi;
    const html = english(
      <VersionHistoryPanel api={api} contentId="c1" open onClose={vi.fn()} onRestored={vi.fn()} />,
    );

    expect(html).toContain('Version history');
    expect(html).toContain('Save a version now');
  });

  it('browses the media library in English', () => {
    const html = english(
      <MediaLibraryBody
        items={[media()]}
        folders={['hero']}
        query=""
        folder={null}
        loading={false}
        error={null}
        uploading={false}
        selectedId="media-1"
        onQueryChange={vi.fn()}
        onFolderChange={vi.fn()}
        onSelect={vi.fn()}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        onSaveAlt={vi.fn()}
        ai={createDemoAiApi()}
      />,
    );

    expect(html).toContain('Search images');
    expect(html).toContain('Upload images');
    expect(html).toContain('Ask the assistant for a description');
  });

  it('creates a form in English', () => {
    const html = english(
      <FormEditorDialog form={null} saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(html).toContain('New form');
    expect(html).toContain('Form name');
    expect(html).toContain('Add a field');
  });

  it('reads the message inbox in English', () => {
    const summary: FormSummary = {
      id: 'f1',
      name: 'Contact us',
      fieldCount: 3,
      submissionCount: 1,
      newCount: 1,
      locale: 'th',
      translationGroupId: 'f1',
      updatedAt: '2026-10-24T03:00:00.000Z',
    };
    const controller = {
      summaries: [summary],
      selectedId: 'f1',
      selected: summary,
      selectedForm: null,
      submissions: [],
      status: 'all',
      loading: false,
      inboxLoading: false,
      error: null,
      cursor: null,
    } as unknown as FormsController;

    const html = english(
      <FormsView
        controller={controller}
        canManage
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain('Forms &amp; messages');
    expect(html).toContain('New form');
    expect(html).toContain('No messages yet');
  });

  it('lists the design tabs in English', () => {
    const html = english(
      <DesignPage api={{} as DesignApi} tab="style" onNavigate={vi.fn()} locales={['th']} />,
    );

    expect(html).toContain('Design');
    expect(html).toContain('Saved sections');
    expect(html).toContain('Switch template');
  });

  it('reports SEO in English', () => {
    const health: SeoHealth = {
      score: 78,
      grade: 'ok',
      publishedCount: 2,
      checks: [
        {
          kind: 'missing_title',
          label: 'ยังไม่มีหน้าเว็บที่เผยแพร่',
          href: '/content/page',
          impact: 'high',
          count: 0,
          done: true,
          items: [],
        },
      ],
    };

    const html = english(
      <SeoView
        health={health}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(html).toContain('Checks');
    expect(html).toContain('Fair');
    expect(html).toContain('published pages');
  });

  it('reports visitor analytics in English', () => {
    const summary: AnalyticsSummary = {
      range: '7d',
      visitors: 240,
      pageviews: 512,
      days: 7,
      previousVisitors: 200,
      changePercent: 20,
      series: [{ date: '2026-10-20', visitors: 120, pageviews: 260 }],
      topPages: [{ label: '/', value: 200 }],
      topReferrers: [{ label: 'google.com', value: 90 }],
      devices: [{ label: 'มือถือ', value: 160 }],
    };

    const html = english(
      <AnalyticsView
        summary={summary}
        range="7d"
        loading={false}
        error={null}
        onRangeChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('Visitors');
    expect(html).toContain('Most opened pages');
    expect(html).toContain('+20% versus the period before');
  });

  it('shows the newsletter list in English', () => {
    const list: SubscriberList = {
      items: [
        {
          id: 's1',
          email: 'somchai@example.com',
          status: 'active',
          createdAt: '2026-10-20T00:00:00.000Z',
        },
      ],
      total: 1,
      activeCount: 1,
      cursor: null,
    };

    const html = english(
      <NewsletterView
        list={list}
        loading={false}
        error={null}
        query=""
        status="all"
        adding={false}
        addError={null}
        canManage
        onQueryChange={vi.fn()}
        onStatusChange={vi.fn()}
        onAdd={vi.fn()}
        onExport={vi.fn()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('Add subscriber');
    expect(html).toContain('Download the list (CSV)');
  });

  it('offers the App store in English', () => {
    const html = english(
      <AppsView
        entries={[]}
        loading
        error={null}
        canManage
        onInstall={vi.fn()}
        onToggle={vi.fn()}
        onUninstall={vi.fn()}
        onOpenSandbox={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('Give the site extra abilities');
  });

  it('edits the site details in English', () => {
    const html = english(
      <GeneralView
        site={site()}
        name="Ban Doi Coffee"
        subdomain="baandoi"
        saving={false}
        error={null}
        onNameChange={vi.fn()}
        onSubdomainChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(html).toContain('Site details');
    expect(html).toContain('Free site address');
  });

  it('manages the team in English', () => {
    const html = english(
      <TeamView
        members={[]}
        email=""
        role="editor"
        busy={false}
        error={null}
        onEmailChange={vi.fn()}
        onRoleChange={vi.fn()}
        onInvite={vi.fn()}
        onMemberRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain('Add a teammate');
    expect(html).toContain('Content editor');
  });

  it('runs the wizard in English', () => {
    const html = english(<WizardPage api={createDemoWizardApi()} onCreated={vi.fn()} />);

    expect(html).toContain('What kind of business is this?');
    expect(html).toContain('Step 1 of 5');
    expect(html).toContain('Restaurant / café');
  });

  it('shows the assistant diff in English', () => {
    const html = english(
      <AiDiffDialog
        proposal={{
          id: 'p1',
          action: 'rewrite',
          label: 'Shorter',
          summary: 'Shorter: 1 message',
          provider: 'demo',
          changes: [{ field: 'text', label: 'Text', before: 'Long', after: 'Short' }],
        }}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(html).toContain('Use it');
    expect(html).toContain('trial mode');
  });
});
