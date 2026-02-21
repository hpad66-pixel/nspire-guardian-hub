/**
 * useOfflineSyncStatus
 *
 * Returns counts of pending and failed offline queue items.
 * Polls every 30 seconds and refreshes when the window comes back online.
 * Used by the sidebar and Settings page to surface sync issues to the user.
 */

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, getFailedItems, clearFailed } from '@/lib/offlineQueue';
import type { OfflineAction } from '@/lib/offlineQueue';

export interface OfflineSyncStatus {
  pendingCount: number;
  failedItems: OfflineAction[];
  failedCount: number;
  clearFailed: () => Promise<void>;
  refresh: () => void;
}

export function useOfflineSyncStatus(): OfflineSyncStatus {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedItems, setFailedItems] = useState<OfflineAction[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [pending, failed] = await Promise.all([getPendingCount(), getFailedItems()]);
      setPendingCount(pending);
      setFailedItems(failed);
    } catch {
      // IndexedDB unavailable (e.g. private browsing) — fail silently
    }
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, 30_000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, [refresh]);

  const handleClearFailed = useCallback(async () => {
    await clearFailed();
    await refresh();
  }, [refresh]);

  return {
    pendingCount,
    failedItems,
    failedCount: failedItems.length,
    clearFailed: handleClearFailed,
    refresh,
  };
}
