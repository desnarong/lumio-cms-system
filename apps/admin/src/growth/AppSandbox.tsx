import { useEffect, useMemo, useRef } from 'react';
import { createBridgeHost } from '@lumio/sdk';
import {
  APP_BRIDGE_METHODS,
  APP_BRIDGE_METHOD_SCOPES,
  requiredScopeFor,
  type AppBridgeMethod,
  type AppPermission,
} from '@lumio/shared';
import {
  Banner,
  Button,
  Modal,
  translateNow,
  useT,
  type MessageKey,
} from '@lumio/ui';

const BRIDGE_LABEL_KEYS: Record<AppBridgeMethod, MessageKey> = {
  'contents.list': 'bridge.contentsList',
  'forms.list': 'bridge.formsList',
  'media.list': 'bridge.mediaList',
  'analytics.summary': 'bridge.analyticsSummary',
};

/** Bridge methods the App is allowed to call, given the scopes it was granted. */
export const allowedBridgeMethods = (permissions: AppPermission[]): AppBridgeMethod[] =>
  APP_BRIDGE_METHODS.filter((method) => permissions.includes(APP_BRIDGE_METHOD_SCOPES[method]));

/**
 * A tiny first-party App used to show the sandbox working. It only knows how to
 * ask the bridge for the methods its scopes allow, and it never sees a token.
 */
export const sampleAppDocument = (appName: string, methods: AppBridgeMethod[]): string => {
  const buttons = methods
    .map(
      (method) =>
        `<button data-method="${method}">${translateNow(BRIDGE_LABEL_KEYS[method])}</button>`,
    )
    .join('');

  const calling = translateNow('demoApp.calling');
  const denied = translateNow('demoApp.denied');

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; color: #0f172a; }
      h1 { font-size: 16px; margin: 0 0 4px; }
      p { color: #64748b; font-size: 13px; margin: 0 0 12px; }
      button { display: block; width: 100%; margin: 0 0 8px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; text-align: left; cursor: pointer; }
      pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; overflow: auto; max-height: 180px; }
    </style>
  </head>
  <body>
    <h1>${appName}</h1>
    <p>${translateNow('demoApp.intro')}</p>
    ${buttons || `<p>${translateNow('demoApp.noAccess')}</p>`}
    <pre id="out">${translateNow('demoApp.idle')}</pre>
    <script>
      var CALLING = ${JSON.stringify(calling)};
      var DENIED = ${JSON.stringify(denied)};
      var counter = 0;
      function call(method) {
        counter += 1;
        var id = 'app_' + counter;
        var out = document.getElementById('out');
        out.textContent = CALLING.replace('{method}', method);
        function onMessage(event) {
          if (!event.data || event.data.id !== id) return;
          window.removeEventListener('message', onMessage);
          out.textContent = event.data.ok
            ? method + '\\n' + JSON.stringify(event.data.result, null, 2)
            : method + '\\n' + DENIED.replace('{error}', event.data.error);
        }
        window.addEventListener('message', onMessage);
        window.parent.postMessage({ id: id, method: method }, '*');
      }
      Array.prototype.forEach.call(document.querySelectorAll('button[data-method]'), function (button) {
        button.addEventListener('click', function () { call(button.getAttribute('data-method')); });
      });
    </script>
  </body>
</html>`;
};

export interface AppSandboxProps {
  appKey: string;
  appName: string;
  permissions: AppPermission[];
  /** Absolute admin-page URL of an external App; null for a first-party sample. */
  entry?: string | null;
  /** Runs one bridge call through the API (which checks the scope again). */
  call: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Runs an installed App inside `sandbox="allow-scripts"` (no `allow-same-origin`),
 * so it can never touch the admin page or its tokens (docs/design/16-apps.md 16.4,
 * 15-security.md 15.3). Every call it makes is answered by the bridge, which only
 * forwards methods the App was granted a scope for.
 */
export const AppSandbox = ({
  appKey,
  appName,
  permissions,
  entry = null,
  call,
  onClose,
}: AppSandboxProps) => {
  const t = useT();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const methods = useMemo(() => allowedBridgeMethods(permissions), [permissions]);

  useEffect(() => {
    const host = createBridgeHost({
      frame: () => frameRef.current?.contentWindow ?? null,
      onCall: async (request) => {
        const scope = requiredScopeFor(request.method);
        if (!scope || !permissions.includes(scope)) {
          throw new Error(translateNow('apps.sandboxDenied'));
        }
        return call(request.method, request.params);
      },
    });

    const listener = (event: MessageEvent): void => host.handleMessage(event);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [call, permissions]);

  return (
    <Modal
      open
      size="lg"
      title={`${appName} (sandbox)`}
      description={t('apps.sandboxDescription')}
      onClose={onClose}
      footer={
        <div className="apps-sandbox__footer">
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <Banner tone="info">
        {t('apps.sandboxSees', {
          list:
            methods.map((method) => t(BRIDGE_LABEL_KEYS[method])).join(' · ') ||
            t('apps.sandboxNoAccess'),
        })}
      </Banner>
      <iframe
        ref={frameRef}
        className="apps-sandbox__frame"
        title={`${appName} sandbox`}
        sandbox="allow-scripts"
        {...(entry ? { src: entry } : { srcDoc: sampleAppDocument(appName, methods) })}
        data-app-key={appKey}
      />
    </Modal>
  );
};
