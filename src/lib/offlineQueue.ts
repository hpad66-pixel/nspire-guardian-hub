/**
 * Offline queue using IndexedDB.
 * Field staff can submit inspections / work-order updates without connectivity.
 * Items are replayed automatically when the device comes back online.
 */

export interface OfflineAction {
  id?: number;
  type: 'daily_inspection' | 'work_order_status' | 'inspection_item';
  payload: Record<string, unknown>;
  timestamp: number;
  retries?: number;
  /** 'pending' (default) | 'failed' — failed items are not retried on next flush */
  status?: 'pending' | 'failed';
  /** Human-readable error message for failed items */
  errorMessage?: string;
}

const DB_NAME = 'apas-offline-queue';
const STORE_NAME = 'actions';
// Version bumped to 2 to add 'status' and 'errorMessage' fields via IDB schema update
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      // v2 adds status + errorMessage as plain fields — no index needed
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(action: Omit<OfflineAction, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...action, status: 'pending' });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAll(): Promise<OfflineAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as OfflineAction[]);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark an item as permanently failed (not retried on next flush). */
export async function markFailed(id: number, errorMessage: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as OfflineAction;
      if (item) {
        store.put({ ...item, status: 'failed', errorMessage });
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const items = await getAll();
  return items.filter(i => (i.status ?? 'pending') === 'pending').length;
}

export async function getFailedItems(): Promise<OfflineAction[]> {
  const items = await getAll();
  return items.filter(i => i.status === 'failed');
}

export async function clearFailed(): Promise<void> {
  const failed = await getFailedItems();
  for (const item of failed) {
    if (item.id !== undefined) await remove(item.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flush handler — callers inject their own Supabase client to avoid circular deps
// ─────────────────────────────────────────────────────────────────────────────
type FlushHandler = (action: OfflineAction) => Promise<void>;

let _flushHandler: FlushHandler | null = null;

export function registerFlushHandler(handler: FlushHandler): void {
  _flushHandler = handler;
}

export interface FlushResult {
  synced: number;
  failed: number;
}

export async function flush(): Promise<FlushResult> {
  const result: FlushResult = { synced: 0, failed: 0 };

  if (!navigator.onLine) return result;
  if (!_flushHandler) return result;

  const items = await getAll();
  // Only flush pending items — skip already-failed ones
  const pending = items.filter(i => (i.status ?? 'pending') === 'pending');
  if (pending.length === 0) return result;

  console.log(`[OfflineQueue] Flushing ${pending.length} pending action(s)…`);

  for (const item of pending) {
    try {
      await _flushHandler(item);
      if (item.id !== undefined) await remove(item.id);
      result.synced++;
      console.log(`[OfflineQueue] ✓ Replayed ${item.type} (id=${item.id})`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[OfflineQueue] ✗ Failed to replay ${item.type} (id=${item.id}):`, err);
      // Mark as failed so it is not retried blindly — user can see it in Settings
      if (item.id !== undefined) await markFailed(item.id, msg);
    }
  }

  return result;
}
