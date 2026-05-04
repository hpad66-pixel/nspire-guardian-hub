async function loadRuntimeConfig() {
  if (typeof window === "undefined") return;

  try {
    const response = await fetch("/api/app-config", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) return;

    const config = await response.json();
    window.__APP_CONFIG__ = config ?? {};
  } catch {
    // Local dev and non-Cloudflare environments fall back to Vite env vars.
  }
}

void (async () => {
  await loadRuntimeConfig();
  await import("./main.tsx");
})();
