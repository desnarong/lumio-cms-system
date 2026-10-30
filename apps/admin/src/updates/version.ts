/** The version baked into this build; it is shown before the API answers. */
export const buildVersion = (): string =>
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__.trim().length > 0
    ? __APP_VERSION__.trim()
    : '0.0.0';
