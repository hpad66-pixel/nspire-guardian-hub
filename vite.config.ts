import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Radix UI components
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
            "@radix-ui/react-checkbox",
          ],
          // Charts
          "vendor-charts": ["recharts"],
          // TipTap rich text editor
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-placeholder",
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // "prompt": a new build does NOT silently take over. The SW installs and
      // waits; the in-app PWAUpdateBanner shows "Reload now" and activates it on
      // click. This replaces the old silent autoUpdate, which left users on stale
      // JS until a manual cache clear.
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/*.png", "robots.txt"],
      manifest: {
        name: "Proj OS",
        short_name: "Proj OS",
        description: "The operating system for construction projects.",
        theme_color: "#1e2d4f",
        background_color: "#0f1624",
        display: "standalone",
        start_url: "/dashboard",
        scope: "/",
        orientation: "portrait-primary",
        categories: ["business", "productivity", "utilities"],
        icons: [
          {
            src: "/icons/apas-os-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/apas-os-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/apas-os-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Do NOT skipWaiting: the new SW waits so PWAUpdateBanner can offer a
        // one-click "Reload now". With skipWaiting omitted, workbox adds a
        // SKIP_WAITING message listener to the generated SW, which the banner
        // posts to before reloading. clientsClaim takes control on activation.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Allow large vendor chunks up to 6 MB in the precache manifest
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // CRITICAL: Never intercept OAuth, auth callbacks, or Supabase redirects.
        // Also exclude the public /schedule-demo preview so the SW passes the
        // request straight to the network static file — the SPA fallback would
        // otherwise hijack it into a protected route.
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/auth\/callback/,
          /^\/auth\//,
          /^\/schedule-demo($|\/|\.)/,
        ],
        // Use index.html as the SPA shell for all navigation — NOT offline.html
        // This ensures the React router handles routing when online
        navigateFallback: "index.html",
        runtimeCaching: [
          // Supabase API — always network first, never serve stale auth data
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
          // Static assets — cache first, long TTL
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          // JS/CSS — stale while revalidate for app shell
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "app-shell-cache" },
          },
        ],
      },
      devOptions: {
        enabled: false, // Keep dev clean — SW only active in production build
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
