import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

// Set only in PR preview builds (see .github/workflows/pr-preview.yml), which deploy to a
// pr-<n>/ subpath of the live site.
const previewPr = process.env.VITE_PREVIEW_PR;

const base = process.env.BASE || '/';
// The site has two pages: the marketing homepage at <base> (index.html) and the app at
// <base>app/ (app/index.html). Static assets are shared at <base>.
const appBase = `${base}app/`;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Client-side routes live under <base>app/, so deep links like <base>app/workout must load
 * the app's page in the dev and preview servers, the way 404.html does on GitHub Pages.
 */
function appRouteFallback(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const path = (req.url || '').split(/[?#]/)[0];
    if (path.startsWith(appBase) && !/\.[a-z0-9]+$/i.test(path)) {
      req.url = `${appBase}index.html${(req.url || '').slice(path.length)}`;
    }
    next();
  };
  return {
    name: 'app-route-fallback',
    configureServer: (server) => { server.middlewares.use(rewrite); },
    configurePreviewServer: (server) => { server.middlewares.use(rewrite); },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    appRouteFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      // The service worker is served from <base>sw.js but only controls the app.
      scope: appBase,
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
        // Offline, any app route opens the app's page. The worker's scope is <base>app/, so
        // the homepage and PR previews (<base>pr-<n>/) are never answered by it.
        navigateFallback: 'app/index.html',
        navigateFallbackAllowlist: [new RegExp(`^${escapeRegExp(appBase)}`)],
        // The homepage and its images aren't needed offline, so keep them out of the precache.
        globIgnores: ['index.html', '404.html', 'assets/landing-*'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/commons\.wikimedia\.org\/w\/api\.php/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wikimedia-search-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Exercise cover/icon images come from arbitrary Wikimedia upload hosts, so
            // match by request destination instead of a single URL pattern. CacheFirst
            // since these images rarely change once fetched. (Fixes stale/broken images
            // across deploys — previously these weren't covered by any runtime caching
            // rule at all.)
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        id: 'app/',
        name: previewPr ? `Pulsar Workouts (PR #${previewPr})` : 'Pulsar Workouts',
        short_name: previewPr ? `Pulsar #${previewPr}` : 'Pulsar',
        description: 'A modern, installable workout and routine tracker.',
        // Relative to the manifest (served at <base>), so they work at any base path: the
        // installed app opens at <base>app/ and stays inside it.
        start_url: 'app/',
        scope: 'app/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#06b6d4',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 9092,
    // `PULSAR_API=http://localhost:8787 npm run dev` sends /api to a running `wrangler dev`, so
    // sign-in works with hot reload. Without it there's no API and sign-in is hidden.
    proxy: process.env.PULSAR_API ? { '/api': { target: process.env.PULSAR_API, changeOrigin: false } } : undefined,
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      // The marketing homepage (index.html, at <base>), the app (app/index.html, at
      // <base>app/), and the privacy policy and terms (<base>privacy/, <base>terms/).
      // See home/README.md.
      input: {
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
      },
    },
  }
});
