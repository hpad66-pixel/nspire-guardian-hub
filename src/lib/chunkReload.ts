/**
 * Stale-chunk recovery. After a deploy, a client still running the previous build
 * may try to lazy-load a JS/CSS chunk whose hashed filename no longer exists on the
 * server → "Failed to fetch dynamically imported module".
 *
 * A plain reload is NOT enough: the PWA service worker precaches the previous
 * index.html and answers reloads from that stale cache, so the browser keeps
 * re-requesting the same dead chunk. Recovery therefore unregisters the service
 * worker and clears caches first, then reloads — forcing a fresh index + chunk
 * manifest from the network. Guarded to run at most once per short window.
 */

const FLAG = "chunk-reload-at";
const GUARD_MS = 10_000; // don't reload again within this window → avoids a reload loop

export function isChunkLoadError(err: unknown): boolean {
  const e = err as any;
  const msg = e?.message ? String(e.message) : String(err ?? "");
  if (e?.name === "ChunkLoadError") return true;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk \S+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    // React.lazy over a STALE/mismatched chunk (the SW served an old build whose
    // chunk resolves to `undefined`) throws when it reads `.default` off it. This
    // is the same stale-chunk failure wearing a different message — recover the
    // same way (evict the SW cache + reload) instead of showing the crash screen.
    /Cannot read propert(?:y|ies) of undefined \(reading 'default'\)/i.test(msg) ||
    /Cannot read property 'default' of undefined/i.test(msg) ||
    /undefined is not an object \(evaluating '[^']*\.default'\)/i.test(msg)
  );
}

/** Unregister service workers + clear caches, then reload to escape a stale precache. */
export async function evictCachesAndReload(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort — reload regardless so we at least re-request the index */
  }
  window.location.reload();
}

/**
 * Recover from a stale chunk, at most once per short window. Evicts the stale
 * service-worker precache and caches, then reloads. Returns true if recovery was
 * triggered, false if suppressed by the loop guard (caller should then show a real
 * error so the user isn't stuck in a reload loop).
 */
export function reloadOnceForChunkError(): boolean {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(FLAG) || 0);
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch {
    /* sessionStorage blocked (private mode) — fall through and still try one reload */
  }
  if (last && Date.now() - last < GUARD_MS) return false; // already reloaded just now
  void evictCachesAndReload();
  return true;
}
