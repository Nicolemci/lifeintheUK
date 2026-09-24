import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "icon-192-maskable.png",
        "icon-512-maskable.png",
      ],
      manifest: {
        name: "Life in the UK Prep",
        short_name: "UK Prep",
        description:
          "Practice mock tests, topic quizzes, and wrong-question revision for the Life in the UK test.",
        theme_color: "#071f4d",
        background_color: "#071f4d",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "en-GB",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache all built static assets for offline use.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,json,txt,xml}"],
        // SPA fallback so React Router deep links work offline / on refresh.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Always hit the network for Supabase Auth/DB/Realtime.
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith("supabase.co") ||
              url.hostname.endsWith("supabase.in"),
            handler: "NetworkOnly",
            method: "GET",
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith("supabase.co") ||
              url.hostname.endsWith("supabase.in"),
            handler: "NetworkOnly",
            method: "POST",
          },
          // Never cache Stripe / Vercel API routes (all methods).
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
            method: "GET",
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
            method: "POST",
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("stripe.com") ||
              url.hostname.includes("stripecdn.com"),
            handler: "NetworkOnly",
            method: "GET",
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("stripe.com") ||
              url.hostname.includes("stripecdn.com"),
            handler: "NetworkOnly",
            method: "POST",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
