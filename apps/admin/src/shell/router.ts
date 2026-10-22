import { useCallback, useEffect, useState } from 'react';

export interface AppRouter {
  path: string;
  navigate: (path: string) => void;
}

const readPath = (): string =>
  typeof window === 'undefined' ? '/dashboard' : window.location.pathname || '/dashboard';

/**
 * Tiny path router. The admin is a single page, so a full router is unnecessary:
 * `pushState` keeps the address bar honest (deep links and reloads work) while the
 * shell renders from state.
 */
export const useAppRouter = (): AppRouter => {
  const [path, setPath] = useState<string>(readPath);

  useEffect(() => {
    const onPopState = (): void => setPath(readPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: string): void => {
    if (typeof window !== 'undefined' && window.location.pathname !== next) {
      window.history.pushState(null, '', next);
    }
    setPath(next);
  }, []);

  return { path, navigate };
};
