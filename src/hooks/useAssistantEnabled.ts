/**
 * useAssistantEnabled — per-browser preference for the floating AI assistant.
 * Stored in localStorage so the launcher only mounts when the user opts in
 * (Settings → Assistant). Syncs across tabs via the storage event.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "buildos-assistant-enabled";

function read(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function useAssistantEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setEnabled(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
    setEnabled(v);
    // Notify same-tab listeners (storage event only fires cross-tab).
    window.dispatchEvent(new CustomEvent("assistant-enabled-changed", { detail: v }));
  }, []);

  useEffect(() => {
    const onLocal = (e: Event) => setEnabled(Boolean((e as CustomEvent).detail));
    window.addEventListener("assistant-enabled-changed", onLocal as EventListener);
    return () => window.removeEventListener("assistant-enabled-changed", onLocal as EventListener);
  }, []);

  return [enabled, set];
}
