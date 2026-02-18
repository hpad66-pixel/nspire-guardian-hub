import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker update handler
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        onNeedRefresh() {
          const shouldUpdate = window.confirm(
            'A new version of NSpire is available. Click OK to update now.'
          );
          if (shouldUpdate) {
            window.location.reload();
          }
        },
        onOfflineReady() {
          console.log('NSpire is ready to work offline.');
        },
      });
    } catch (e) {
      // PWA registration not available in dev mode
    }
  });
}
