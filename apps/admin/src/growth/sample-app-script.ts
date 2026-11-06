/**
 * Script of the first-party demo App (see `AppSandbox.tsx`). The sandboxed
 * `srcdoc` iframe inherits the admin's CSP, so this text must never change per
 * render: the build hashes it into `script-src` (src/security/csp.ts). Labels
 * reach it through `data-*` attributes on <body> instead of being spliced in.
 */
export const SAMPLE_APP_SCRIPT = `
      var CALLING = document.body.getAttribute('data-calling') || '';
      var DENIED = document.body.getAttribute('data-denied') || '';
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
    `;
