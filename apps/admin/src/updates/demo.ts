import { buildUpdateStatus, type UpdateStatus } from '@lumio/shared';
import type { UpdatesApi } from './api.js';
import { buildVersion } from './version.js';

/** Demo deployments always run the version they were built from. */
export const createDemoUpdatesApi = (version = buildVersion()): UpdatesApi => {
  const status = (): Promise<UpdateStatus> => Promise.resolve(buildUpdateStatus(version));

  return {
    status,
    check: status,
  };
};
