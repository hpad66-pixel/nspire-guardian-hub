import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Bump when another forced SW eviction is needed (e.g. a future cache split).
const SW_CLEANUP_VERSION = "2026-05-04-cloudflare-pages-env-reset";
const SW_CLEANUP_KEY = "proj-os-sw-cleanup";

async function evictStaleServiceWorkers(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const regs = await navigator.serviceWorker.getRegistrations();
  const names = "caches" in window ? await caches.keys() : [];
  if (regs.length === 0 && names.length === 0) return false;
  await Promise.all(regs.map((r) => r.unregister()));
  await Promise.all(names.map((n) => caches.delete(n)));
  return true;
}

if (typeof window !== "undefined") {
  const last = window.localStorage.getItem(SW_CLEANUP_KEY);
  if (last !== SW_CLEANUP_VERSION) {
    window.localStorage.setItem(SW_CLEANUP_KEY, SW_CLEANUP_VERSION);
    evictStaleServiceWorkers()
      .then((evicted) => {
        if (evicted) window.location.reload();
        else mountApp();
      })
      .catch(() => mountApp());
  } else {
    mountApp();
  }
}

function mountApp() {
  createRoot(document.getElementById("root")!).render(<App />);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const { registerSW } = await import("virtual:pwa-register");
        registerSW({ immediate: true });
      } catch {
        // PWA registration unavailable in dev mode — expected.
      }
    });
  }
}
