import { useEffect, useMemo, useState } from 'react';
import { FEATURE_FLAG_KEYS, HOME_SLUG, type ContentType, type FeatureFlagKey, type Role } from '@lumio/shared';
import {
  MessagesProvider,
  Skeleton,
  ToastProvider,
  translateNow,
  useT,
  type UiLocale,
} from '@lumio/ui';
import { ApiError } from './api-error.js';
import { LoginPage } from './auth/LoginPage.js';
import { createAdminClients, type AdminClients } from './clients.js';
import { CommercePage } from './commerce/CommercePage.js';
import { ContentListPage } from './content/ContentListPage.js';
import { CreateContentDialog } from './content/CreateContentDialog.js';
import { DashboardPage } from './dashboard/DashboardPage.js';
import { DesignPage } from './design/DesignPage.js';
import { EditorPage } from './editor/EditorPage.js';
import { FormsPage } from './forms/FormsPage.js';
import { GrowthPage } from './growth/GrowthPage.js';
import { MediaLibraryPage } from './media/MediaLibraryPage.js';
import { MediaLibraryProvider } from './media/MediaLibraryProvider.js';
import { isRouteAllowed, parseRoute, resolveRoute, routePath, type AdminRoute } from './route.js';
import { SettingsPage } from './settings/SettingsPage.js';
import { AdminShell } from './shell/AdminShell.js';
import { readAdminLocale, writeAdminLocale } from './shell/locale-preference.js';
import { featureForRoute } from './shell/nav.js';
import { useAppRouter } from './shell/router.js';
import { WizardPage } from './wizard/WizardPage.js';

export interface AppProps {
  /** Injectable for tests; the real entry builds clients from `VITE_API_URL`. */
  clients?: AdminClients;
}

const rootDomain = (): string => import.meta.env.VITE_PUBLIC_ROOT_DOMAIN ?? 'lumio.app';

/** First paint while the site is resolved; it sits inside the message provider. */
const Splash = () => {
  const t = useT();
  return (
    <div className="admin-splash" aria-busy="true">
      <Skeleton shape="block" height={160} />
      <p className="admin-splash__text">{t('app.opening')}</p>
    </div>
  );
};

/** Roles that may change a form; everyone else reads the inbox only (13-rbac.md). */
const FORM_MANAGER_ROLES: Role[] = ['owner', 'admin', 'editor'];
/** Roles that may edit the newsletter list (App installs are gated by the route). */
const GROWTH_MANAGER_ROLES: Role[] = ['owner', 'admin', 'editor'];
/** Everyone who edits the site can manage products and orders. */
const SHOP_ROLES: Role[] = ['owner', 'admin', 'editor'];
/** Payment and shipping settings are owners/admins only. */
const SHOP_SETTINGS_ROLES: Role[] = ['owner', 'admin'];

interface ShellContext {
  siteName: string;
  role: Role;
  publicUrl: string;
  /** Languages the site offers, for the content list's language filter. */
  locales: string[];
  /** Add-ons this site offers; screens of closed ones disappear from the menus. */
  features: FeatureFlagKey[];
}

const DEMO_CONTEXT: ShellContext = {
  siteName: 'กาแฟบ้านดอย',
  role: 'owner',
  publicUrl: 'https://baandoi.lumio.app',
  locales: ['th', 'en'],
  features: [...FEATURE_FLAG_KEYS],
};

/**
 * Name, role and public address of the current site, so the top bar and the role
 * based menus have something to show.
 */
const loadShellContext = async (clients: AdminClients): Promise<ShellContext> => {
  if (clients.demo) return DEMO_CONTEXT;

  const siteId = clients.session.read()?.siteId ?? null;
  const sites = await clients.wizard.listSites().catch(() => []);
  const site = sites.find((entry) => entry.id === siteId) ?? sites[0];
  if (!site) {
    return { siteName: '', role: 'owner', publicUrl: '', locales: [], features: [...FEATURE_FLAG_KEYS] };
  }

  // A site that closed an add-on must not see its menu entries; when the request
  // fails we keep everything visible rather than hiding working screens.
  const features = await clients.settings
    .getFeatures()
    .then((list) => list.items.filter((item) => item.enabled).map((item) => item.key))
    .catch(() => [...FEATURE_FLAG_KEYS]);

  return {
    siteName: site.name,
    role: site.role,
    publicUrl: `https://${site.subdomain}.${rootDomain()}`,
    locales: site.locales,
    features,
  };
};

/**
 * Admin shell: sign in, then either the onboarding wizard (no site yet) or the
 * back office (dashboard, content, design, settings) around the page editor.
 * With no `VITE_API_URL` every client runs in memory, so the whole flow works
 * before a backend is configured.
 */
export const App = ({ clients }: AppProps) => {
  const resolved = useMemo(
    () => clients ?? createAdminClients({ apiUrl: import.meta.env.VITE_API_URL ?? '' }),
    [clients],
  );

  return (
    <ToastProvider>
      <AdminApp clients={resolved} />
    </ToastProvider>
  );
};

export const AdminApp = ({ clients }: { clients: AdminClients }) => {
  const router = useAppRouter();
  const navigate = router.navigate;
  // No session means we already know the first screen: no spinner needed.
  const [ready, setReady] = useState(() => clients.session.read() === null);
  const [context, setContext] = useState<ShellContext | null>(null);
  const [locale, setLocale] = useState<UiLocale>(() => readAdminLocale());

  /** Language of the back office chrome; remembered per browser. */
  const changeLocale = (next: UiLocale): void => {
    writeAdminLocale(next);
    setLocale(next);
  };
  const [creating, setCreating] = useState<ContentType | null>(null);
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Resolve the site once, then keep the URL in step with the screen.
  useEffect(() => {
    if (!clients.session.read()) return undefined;
    let active = true;
    void resolveRoute(clients).then((next) => {
      if (!active) return;
      navigate(routePath(next));
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [clients, navigate]);

  useEffect(() => {
    let active = true;
    void loadShellContext(clients).then((loaded) => {
      if (active) setContext(loaded);
    });
    return () => {
      active = false;
    };
  }, [clients]);

  const go = (path: string): void => navigate(path);

  const route: AdminRoute | null = !ready
    ? null
    : clients.session.read()
      ? (parseRoute(router.path) ?? { name: 'dashboard' })
      : { name: 'login' };

  if (!route) {
    return (
      <MessagesProvider locale={locale}>
        <Splash />
      </MessagesProvider>
    );
  }

  if (route.name === 'login') {
    return (
      <LoginPage
        api={clients.auth}
        {...(clients.demoHint ? { hint: clients.demoHint } : {})}
        onSignedIn={(session) => {
          clients.session.write({
            accessToken: session.accessToken,
            user: session.user,
            siteId: null,
          });
          void resolveRoute(clients).then((next) => go(routePath(next)));
        }}
      />
    );
  }

  if (route.name === 'wizard') {
    return (
      <WizardPage
        ai={clients.ai}
        api={clients.wizard}
        logoPalette={(mediaId) => clients.media.palette(mediaId)}
        {...(clients.uploadLogo ? { uploadLogo: clients.uploadLogo } : {})}
        onCreated={(created) => {
          clients.session.setSiteId(created.siteId);
          const home = created.pages.find((page) => page.slug === HOME_SLUG) ?? created.pages[0];
          go(home ? `/editor/${home.id}` : '/wizard');
        }}
        {...(clients.demo
          ? {}
          : { siteUrlFor: (created) => `https://${created.subdomain}.${rootDomain()}` })}
      />
    );
  }

  const role = context?.role ?? 'owner';
  const closedFeature = featureForRoute(route);
  const featureOpen = !closedFeature || !context || context.features.includes(closedFeature);
  const effective: AdminRoute =
    isRouteAllowed(route, role) && featureOpen ? route : { name: 'dashboard' };

  const signOut = (): void => {
    void clients.auth.logout().catch(() => undefined);
    clients.session.clear();
    go('/login');
  };

  const openCreate = (kind: ContentType): void => {
    setCreateError(null);
    setCreating(kind);
  };

  const submitCreate = async (input: { title: string; slug: string }): Promise<void> => {
    if (!creating) return;
    setCreatingBusy(true);
    setCreateError(null);
    try {
      const created = await clients.content.create({
        type: creating,
        title: input.title,
        slug: input.slug,
        locale: 'th',
        blocks: [],
        seo: { noindex: false },
      });
      setCreating(null);
      go(`/editor/${created.id}`);
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : translateNow('app.createError'));
    } finally {
      setCreatingBusy(false);
    }
  };

  const content =
    effective.name === 'editor' ? (
      <MediaLibraryProvider api={clients.media} ai={clients.ai}>
        <EditorPage
          api={clients.content}
          contentId={effective.contentId}
          sectionsApi={clients.sections}
          formsApi={clients.forms}
          ai={clients.ai}
          design={clients.design}
          onBack={() => go('/dashboard')}
          onSignOut={signOut}
          onOpenContent={(contentId) => go(`/editor/${contentId}`)}
        />
      </MediaLibraryProvider>
    ) : (
      <AdminShell
        route={effective}
        siteName={context?.siteName ?? ''}
        userName={clients.session.read()?.user.name ?? ''}
        role={role}
        features={context?.features}
        locale={locale}
        onLocaleChange={changeLocale}
        {...(context?.publicUrl ? { publicUrl: context.publicUrl } : {})}
        canCreate={role !== 'viewer'}
        onCreate={openCreate}
        searchContent={async (query) => {
          const page = await clients.content.list({ q: query, limit: 6 });
          return page.items.map((item) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            slug: item.slug,
          }));
        }}
        onNavigate={go}
        onSignOut={signOut}
      >
        {effective.name === 'dashboard' ? (
          <DashboardPage
            api={clients.dashboard}
            onCreate={openCreate}
            onOpenEditor={(contentId) => go(`/editor/${contentId}`)}
            onNavigate={go}
          />
        ) : null}
        {effective.name === 'content' ? (
          <ContentListPage
            api={clients.content}
            kind={effective.kind}
            locales={context?.locales ?? []}
            onCreate={openCreate}
            onOpenEditor={(contentId) => go(`/editor/${contentId}`)}
          />
        ) : null}
        {effective.name === 'forms' ? (
          <FormsPage
            api={clients.forms}
            canManage={FORM_MANAGER_ROLES.includes(role)}
            locales={context?.locales ?? []}
          />
        ) : null}
        {effective.name === 'media' ? (
          <MediaLibraryPage api={clients.media} ai={clients.ai} onBack={() => go('/dashboard')} />
        ) : null}
        {effective.name === 'design' ? (
          <DesignPage
            api={clients.design}
            tab={effective.tab}
            onNavigate={go}
            locales={context?.locales ?? []}
          />
        ) : null}
        {effective.name === 'commerce' ? (
          <CommercePage
            api={clients.commerce}
            media={clients.media}
            tab={effective.tab}
            canManage={
              effective.tab === 'settings'
                ? SHOP_SETTINGS_ROLES.includes(role)
                : SHOP_ROLES.includes(role)
            }
            onNavigate={go}
          />
        ) : null}
        {effective.name === 'growth' ? (
          <GrowthPage
            tab={effective.tab}
            apis={{
              seo: clients.seo,
              analytics: clients.analytics,
              newsletter: clients.newsletter,
              apps: clients.apps,
            }}
            canManage={GROWTH_MANAGER_ROLES.includes(role)}
            onNavigate={go}
          />
        ) : null}
        {effective.name === 'settings' ? (
          <SettingsPage
            api={clients.settings}
            billing={clients.billing}
            security={clients.auth}
            tab={effective.tab}
            onNavigate={go}
          />
        ) : null}
      </AdminShell>
    );

  return (
    <MessagesProvider locale={locale}>
      {content}
      <CreateContentDialog
        open={creating !== null}
        kind={creating ?? 'page'}
        creating={creatingBusy}
        error={createError}
        onCancel={() => setCreating(null)}
        onSubmit={(input) => void submitCreate(input)}
      />
    </MessagesProvider>
  );
};
