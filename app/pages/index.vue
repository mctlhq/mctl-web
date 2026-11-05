<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: computed(() => t('meta.title')),
  meta: [
    { name: 'description', content: computed(() => t('meta.description')) },
    { property: 'og:title', content: computed(() => t('meta.og_title')) },
    { property: 'og:description', content: computed(() => t('meta.og_description')) },
    { name: 'twitter:title', content: computed(() => t('meta.tw_title')) },
    { name: 'twitter:description', content: computed(() => t('meta.tw_description')) },
  ],
})
</script>

<template>
  <article class="main-page">
    <HeroBlock />
    <RequestAccessSection />
    <WhySection />
    <OrchestrationSection />
    <FeaturesSection />
    <AudienceSection />
    <TechStackSection />
    <HowToStartSection />
    <PricingSection />
    <ContactSection />
  </article>
</template>
