import { headers } from 'next/headers';
import { resolveRequestHost } from './host';

/** Host of the incoming request, read on the server only. */
export const requestHost = async (): Promise<string> => {
  const store = await headers();
  return resolveRequestHost(store.get('x-forwarded-host'), store.get('host'));
};
