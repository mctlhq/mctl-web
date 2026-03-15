// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  nitro: {
    prerender: {
      crawlLinks: true,
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
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap',
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
})
