/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// No GitHub Pages o app fica em https://lpassos40.github.io/mapitas/
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/mapitas/' : '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Mapitas — Cedral ⇄ Rio Preto',
        short_name: 'Mapitas',
        description: 'Guia pessoal de ônibus Cedral ⇄ São José do Rio Preto',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1565c0',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        runtimeCaching: [
          {
            // Só os tiles já vistos; nada de pré-download (política de uso da OSM).
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 1500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
}));
