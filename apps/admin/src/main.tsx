import '@lumio/tokens/theme.css';
import '@lumio/ui/styles.css';
import '@lumio/blocks/styles.css';
import './styles.css';
import './ai/ai.css';
import './auth/auth.css';
import './commerce/commerce.css';
import './content/content.css';
import './dashboard/dashboard.css';
import './design/design.css';
import './editor/editor.css';
import './forms/forms.css';
import './growth/growth.css';
import './media/media.css';
import './settings/settings.css';
import './shell/shell.css';
import './wizard/wizard.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('ไม่พบ element #root สำหรับ mount แอป');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
