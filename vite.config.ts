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
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/*.png", "robots.txt"],
      manifest: {
        name: "APAS OS",
        short_name: "APAS OS",
        description: "One platform to run everything.",
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
        // CRITICAL: Never cache OAuth redirects
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth\/callback/],
        navigateFallback: "/offline.html",
        runtimeCaching: [
          // Supabase API — always network first, fall through on failure
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
