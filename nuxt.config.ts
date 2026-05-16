import svgLoader from 'vite-svg-loader';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,
  // Design tokens (--mctl-* variables) — single source of truth from mctl-design.
  // base.scss aliases its legacy variables onto these tokens.
  css: ['@mctlhq/css/theme.css'],
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/privacy', '/docs'],
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'MCTL — Kubernetes Platform for Growing Product Teams',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Self-service Kubernetes for product teams. GitOps, secrets, team isolation — production-ready from day one. No platform team required.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'MCTL — Kubernetes Platform for Growing Product Teams' },
        { property: 'og:description', content: 'Self-service Kubernetes for product teams. GitOps, secrets, team isolation — production-ready from day one. No platform team required.' },
        { property: 'og:url', content: 'https://mctl.ai' },
        { property: 'og:image', content: 'https://mctl.ai/img/og-image.svg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'MCTL — Kubernetes Platform for Growing Product Teams' },
        { name: 'twitter:description', content: 'Self-service Kubernetes for product teams. No platform team required. Production-ready from day one.' },
        { name: 'twitter:image', content: 'https://mctl.ai/img/og-image.svg' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/img/favicon.svg?v=2' },
        { rel: 'apple-touch-icon', href: '/img/apple-touch-icon.svg?v=2' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  router: {
    options: {
      scrollBehaviorType: 'smooth',
    },
  },
  routeRules: {
    '/api/**': { prerender: false },
  },
  vite: {
    plugins: [svgLoader()],
  },
  runtimeConfig: {
    // Private keys are only available on the server
    apiSecret: '123',

    // Public keys that are exposed to the client
    public: {
      baseUrlFront: import.meta.env.NUXT_PUBLIC_FRONT_BASE || '',
    },
  },
});
