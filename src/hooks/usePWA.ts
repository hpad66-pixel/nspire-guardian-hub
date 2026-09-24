import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_DISMISSED_UNTIL_KEY = 'apas-os-install-dismissed-until';
const INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

let sharedInstallPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

function installPromptDismissedNow() {
  const dismissedUntil = Number(localStorage.getItem(INSTALL_DISMISSED_UNTIL_KEY) || '0');
  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
}

function publishInstallPrompt(prompt: BeforeInstallPromptEvent | null) {
  sharedInstallPrompt = prompt;
  promptListeners.forEach((listener) => listener(prompt));
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(sharedInstallPrompt);
  const [isInstallable, setIsInstallable] = useState(Boolean(sharedInstallPrompt));
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Detect iOS (also treat iPadOS desktop-UA as iOS for Add to Home Screen).
    const ua = navigator.userAgent;
    const ios =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Detect if already installed (standalone / TWA / iOS home-screen).
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    // Listen for Chrome/Android/desktop install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      publishInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      if (!standalone && !installPromptDismissedNow()) {
        setShowBanner(true);
      }
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowBanner(false);
      publishInstallPrompt(null);
    };

    const onSharedPromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setInstallPrompt(prompt);
      setIsInstallable(Boolean(prompt));
    };
    promptListeners.add(onSharedPromptChange);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);

    // Keep the install offer visible in normal use, but respect a temporary
    // dismissal so it feels helpful instead of noisy.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!standalone && !installPromptDismissedNow()) {
      timer = setTimeout(() => setShowBanner(true), 2500);
    }

    return () => {
      if (timer) clearTimeout(timer);
      promptListeners.delete(onSharedPromptChange);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    const prompt = installPrompt ?? sharedInstallPrompt;
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      }
      publishInstallPrompt(null);
      return;
    }
    // iOS / browsers without beforeinstallprompt — send them to the guide.
    if (window.location.pathname !== '/install') {
      window.location.assign('/install');
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem(
      INSTALL_DISMISSED_UNTIL_KEY,
      String(Date.now() + INSTALL_DISMISS_COOLDOWN_MS),
    );
    localStorage.removeItem('apas-os-install-dismissed');
  };

  return { isInstallable, isIOS, isInstalled, showBanner, install, dismiss };
}

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cleanup = () => {};

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      // Check for a new SW already waiting from a previous visit.
      if (reg.waiting) setNeedRefresh(true);

      // Force an update check now so a fresh deploy is detected immediately and
      // the "Update available" banner appears right away instead of an open tab
      // serving the stale precached app.
      const check = () => reg.update().catch(() => {});
      check();

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      });

      // An ALREADY-OPEN tab is the stale-code trap: without this it would only
      // notice a deploy on the hourly poll. Re-check whenever the user returns to
      // the tab (or the window regains focus) so returning to projOS after a push
      // surfaces the reload banner within seconds — plus a 15-minute safety poll.
      const onVisible = () => { if (document.visibilityState === 'visible') check(); };
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', check);
      const poll = window.setInterval(check, 15 * 60 * 1000);
      cleanup = () => {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', check);
        window.clearInterval(poll);
      };
    });

    return () => cleanup();
  }, []);

  const updateServiceWorker = () => {
    const waiting = registration?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    // Tell the waiting SW to activate, then reload only once it controls the
    // page — reloading before that would just re-serve the old precache. A
    // short fallback covers the rare case controllerchange never fires.
    let reloaded = false;
    const reload = () => { if (!reloaded) { reloaded = true; window.location.reload(); } };
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(reload, 2000);
  };

  return { needRefresh, updateServiceWorker };
}
