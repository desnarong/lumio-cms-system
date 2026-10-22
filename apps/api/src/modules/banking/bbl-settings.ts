import type { BankSettings } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { decryptSecret } from '../../common/secret-box';
import { bblConfigFor, type BblConfig } from './bbl';

/**
 * Turns one shop's stored banking settings into a BBL client config. The secret
 * is decrypted only here, at call time, and only for the site being served, so
 * plaintext never touches the database, logs or the browser.
 */
export const bblConfigForSite = (settings: BankSettings): BblConfig => {
  if (settings.clientId.length === 0 || settings.clientSecret.length === 0) {
    throw ApiException.conflict(
      'ร้านนี้ยังไม่ได้กรอก Client ID และ Client Secret ของธนาคารกรุงเทพ',
    );
  }

  return bblConfigFor({
    clientId: settings.clientId,
    clientSecret: decryptSecret(settings.clientSecret),
    apiKey: settings.apiKey.length > 0 ? decryptSecret(settings.apiKey) : '',
    baseUrl: settings.baseUrl,
    sandbox: settings.sandbox,
  });
};
