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
}

const DB_NAME = 'apas-offline-queue';
const STORE_NAME = 'actions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(action: Omit<OfflineAction, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(): Promise<OfflineAction[]> {
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

export async function getPendingCount(): Promise<number> {
  const items = await getAll();
  return items.length;
}

// Flush handler — callers inject their own Supabase client to avoid circular deps
type FlushHandler = (action: OfflineAction) => Promise<void>;

let _flushHandler: FlushHandler | null = null;

export function registerFlushHandler(handler: FlushHandler): void {
  _flushHandler = handler;
}

export async function flush(): Promise<void> {
  if (!navigator.onLine) return;
  if (!_flushHandler) return;

  const items = await getAll();
  if (items.length === 0) return;

  console.log(`[OfflineQueue] Flushing ${items.length} queued action(s)...`);

  for (const item of items) {
    try {
      await _flushHandler(item);
      if (item.id !== undefined) await remove(item.id);
      console.log(`[OfflineQueue] Replayed action ${item.type} (id=${item.id})`);
    } catch (err) {
      console.error(`[OfflineQueue] Failed to replay ${item.type}:`, err);
    }
  }
}

// Auto-flush on coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flush().catch(console.error);
  });
}
