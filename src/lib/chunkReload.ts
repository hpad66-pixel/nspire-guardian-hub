/**
 * Stale-chunk recovery. After a deploy, a client still running the previous build
 * may try to lazy-load a JS/CSS chunk whose hashed filename no longer exists on the
 * server → "Failed to fetch dynamically imported module". The fix is to reload once
 * so the browser pulls the fresh index + new chunk manifest.
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
    /Loading CSS chunk/i.test(msg)
  );
}

/**
 * Reload the page to recover from a stale chunk, at most once per short window.
 * Returns true if a reload was triggered, false if suppressed by the loop guard
 * (in which case the caller should show a real error so the user isn't stuck).
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
  window.location.reload();
  return true;
}
