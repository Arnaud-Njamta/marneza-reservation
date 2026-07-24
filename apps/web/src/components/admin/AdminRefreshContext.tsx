'use client';

/**
 * Synchronisation admin — rafraîchissement automatique toutes les 30 s + au focus.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const POLL_MS = 30000;

type RefreshOptions = { silent?: boolean };
type RefreshHandler = (opts?: RefreshOptions) => void | Promise<void>;

type AdminRefreshContextValue = {
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  refreshNow: (opts?: RefreshOptions) => Promise<void>;
  registerRefresh: (handler: RefreshHandler) => () => void;
};

const AdminRefreshContext = createContext<AdminRefreshContextValue | null>(null);

export function AdminRefreshProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(new Set<RefreshHandler>());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshNow = useCallback(async (opts?: RefreshOptions) => {
    const handlers = [...handlersRef.current];
    if (handlers.length === 0) return;

    setIsRefreshing(true);
    try {
      await Promise.all(handlers.map((h) => Promise.resolve(h(opts))));
      setLastUpdatedAt(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const registerRefresh = useCallback((handler: RefreshHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        refreshNow({ silent: true });
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshNow({ silent: true });
      }
    };

    const interval = setInterval(tick, POLL_MS);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshNow]);

  return (
    <AdminRefreshContext.Provider
      value={{ lastUpdatedAt, isRefreshing, refreshNow, registerRefresh }}
    >
      {children}
    </AdminRefreshContext.Provider>
  );
}

export function useAdminRefresh() {
  const ctx = useContext(AdminRefreshContext);
  if (!ctx) {
    throw new Error('useAdminRefresh must be used within AdminRefreshProvider');
  }
  return ctx;
}

/** Enregistre un handler de rechargement + charge au montage */
export function useAdminAutoRefresh(handler: RefreshHandler, deps: unknown[]) {
  const { registerRefresh, refreshNow } = useAdminRefresh();

  useEffect(() => {
    const unregister = registerRefresh(handler);
    void Promise.resolve(handler({ silent: false }));
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerRefresh, ...deps]);

  return refreshNow;
}

export function formatLastSync(ms: number | null) {
  if (!ms) return null;
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 5) return 'À l\'instant';
  if (sec < 60) return `Il y a ${sec} s`;
  return `Il y a ${Math.floor(sec / 60)} min`;
}
